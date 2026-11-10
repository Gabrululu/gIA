"""Read-only validation of public Injective data. Does not sign or broadcast."""
import concurrent.futures
import datetime
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
USDC = "0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d"


def get_json(url, payload=None):
    body = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(url, data=body, headers={
        "User-Agent": "gIA-read-only-validation/0.1", "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=25) as response:
        return json.load(response)


def read_network(network):
    prefix = "testnet." if network == "testnet" else ""
    base = f"https://{prefix}sentry.lcd.injective.network"
    results = {"network": network}
    paths = {
        "node": "/cosmos/base/tendermint/v1beta1/node_info",
        "derivatives": "/injective/exchange/v1beta1/derivative/markets",
        "providers": "/injective/oracle/v1beta1/provider_prices",
    }
    for name, path in paths.items():
        url = base + path
        try:
            data = get_json(url)
            if name == "node":
                value = {"chainId": data["default_node_info"]["network"]}
            elif name == "derivatives":
                markets = data["markets"]
                value = {"count": len(markets), "sici": [m for m in markets
                    if "sici" in m.get("market", {}).get("ticker", "").lower()]}
            else:
                value = {"sici": []}
                for provider in data["providerState"]:
                    for price in provider.get("provider_price_states", []):
                        if price.get("symbol") == "SICI/USDC":
                            state = price["state"]
                            value["sici"].append({
                                "provider": provider["provider_info"]["provider"],
                                "symbol": price["symbol"], "price": state["price"],
                                "asOf": datetime.datetime.fromtimestamp(
                                    int(state["timestamp"]), datetime.UTC).isoformat(),
                            })
            results[name] = {"url": url, "ok": True, **value}
        except Exception as error:
            results[name] = {"url": url, "ok": False, "error": str(error)}
    return results


def read_options_interface():
    base = "https://testnet.sentry.exchange.grpc-web.injective.network"
    results = {}
    for name, path in {
        "swagger": "/swagger/swagger.json",
        "binaryOptions": "/api/exchange/derivative/v1/binaryOptionsMarkets",
    }.items():
        url = base + path
        try:
            data = get_json(url)
            if name == "swagger":
                value = {"optionPaths": [p for p in data["paths"] if "option" in p.lower()]}
            else:
                markets = data["markets"]
                value = {"count": len(markets), "paging": data.get("paging"),
                         "tickers": [m["ticker"] for m in markets],
                         "sici": [m for m in markets if "sici" in m.get("ticker", "").lower()]}
            results[name] = {"url": url, "ok": True, **value}
        except Exception as error:
            results[name] = {"url": url, "ok": False, "error": str(error)}
    results["interpretation"] = "Binary options are a different product. No capped-call availability is inferred from this list or from an empty result."
    return results


def read_usdc():
    rpc = "https://k8s.testnet.json-rpc.injective.network/"
    results = {"url": rpc, "address": USDC}
    for method, params in [
        ("eth_chainId", []), ("eth_getCode", [USDC, "latest"]),
        ("eth_call", [{"to": USDC, "data": "0x313ce567"}, "latest"]),
    ]:
        try:
            response = get_json(rpc, {"jsonrpc": "2.0", "id": 1, "method": method, "params": params})
            if "error" in response:
                raise ValueError(response["error"])
            value = response["result"]
            if method == "eth_getCode":
                code = bytes.fromhex(value[2:])
                results[method] = {"hasCode": bool(code), "bytes": len(code),
                                   "sha256": hashlib.sha256(code).hexdigest()}
            else:
                results[method] = int(value, 16)
        except Exception as error:
            results[method] = {"error": str(error)}
    return results


if __name__ == "__main__":
    report = {"checkedAt": datetime.datetime.now(datetime.UTC).isoformat(),
              "scope": "Public read-only queries; no wallet, signature or transaction."}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        jobs = {"mainnet": pool.submit(read_network, "mainnet"),
                "testnet": pool.submit(read_network, "testnet"),
                "options": pool.submit(read_options_interface),
                "testnetUsdc": pool.submit(read_usdc)}
        for name, job in jobs.items():
            report[name] = job.result()
    target = ROOT / "docs/validation/injective-markets.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, indent=2) + "\n")
    print(f"Saved {target.relative_to(ROOT)}. Inspect ok/error fields; availability is not guaranteed.")
