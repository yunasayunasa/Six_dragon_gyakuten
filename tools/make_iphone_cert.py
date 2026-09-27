"""Create a short-lived, local-only CA and a LAN HTTPS certificate.

The private keys stay in the ignored .godot/tls directory. Only iphone-ca.cer
may be given to the phone, and only for this development session.
"""
from pathlib import Path
import argparse
import datetime
import hashlib
import ipaddress

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID

parser = argparse.ArgumentParser()
parser.add_argument("--ip", required=True, type=ipaddress.ip_address)
args = parser.parse_args()

dest = Path(__file__).resolve().parents[1] / ".godot" / "tls"
dest.mkdir(parents=True, exist_ok=True)
paths = {name: dest / name for name in (
    "iphone-ca.key", "iphone-ca.cer", "iphone-server.key", "iphone-server.crt"
)}
if any(path.exists() for path in paths.values()):
    raise SystemExit("Existing iPhone certificates detected; refusing overwrite")

now = datetime.datetime.now(datetime.timezone.utc)
before = now - datetime.timedelta(minutes=5)
after = now + datetime.timedelta(days=30)
ca_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
ca_name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "PaperHD2D Local CA")])
ca_cert = (
    x509.CertificateBuilder()
    .subject_name(ca_name).issuer_name(ca_name).public_key(ca_key.public_key())
    .serial_number(x509.random_serial_number())
    .not_valid_before(before).not_valid_after(after)
    .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
    .add_extension(x509.KeyUsage(digital_signature=False, content_commitment=False,
                                 key_encipherment=False, data_encipherment=False,
                                 key_agreement=False, key_cert_sign=True,
                                 crl_sign=True, encipher_only=False, decipher_only=False), critical=True)
    .add_extension(x509.SubjectKeyIdentifier.from_public_key(ca_key.public_key()), critical=False)
    .sign(ca_key, hashes.SHA256())
)
server_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
server_name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "PaperHD2D LAN")])
server_cert = (
    x509.CertificateBuilder()
    .subject_name(server_name).issuer_name(ca_name).public_key(server_key.public_key())
    .serial_number(x509.random_serial_number())
    .not_valid_before(before).not_valid_after(after)
    .add_extension(x509.SubjectAlternativeName([x509.IPAddress(args.ip),
                                                x509.IPAddress(ipaddress.ip_address("127.0.0.1")),
                                                x509.DNSName("localhost")]), critical=False)
    .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
    .add_extension(x509.KeyUsage(digital_signature=True, content_commitment=False,
                                 key_encipherment=True, data_encipherment=False,
                                 key_agreement=False, key_cert_sign=False,
                                 crl_sign=False, encipher_only=False, decipher_only=False), critical=True)
    .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]), critical=False)
    .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(ca_key.public_key()), critical=False)
    .sign(ca_key, hashes.SHA256())
)
def private_bytes(key):
    return key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                             serialization.NoEncryption())

paths["iphone-ca.key"].write_bytes(private_bytes(ca_key))
paths["iphone-ca.cer"].write_bytes(ca_cert.public_bytes(serialization.Encoding.DER))
paths["iphone-server.key"].write_bytes(private_bytes(server_key))
paths["iphone-server.crt"].write_bytes(server_cert.public_bytes(serialization.Encoding.PEM))
print("LAN IP:", args.ip)
print("CA SHA-256:", hashlib.sha256(paths["iphone-ca.cer"].read_bytes()).hexdigest().upper())
print("Valid until:", after.isoformat())
