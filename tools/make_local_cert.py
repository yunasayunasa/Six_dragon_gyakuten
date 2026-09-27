"""Temporary self-signed TLS leaf for localhost/LAN testing; key stays in .godot/."""
from pathlib import Path
import datetime,ipaddress
from cryptography import x509
from cryptography.hazmat.primitives import hashes,serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID,ExtendedKeyUsageOID
root=Path(__file__).resolve().parents[1]
dest=root/'.godot'/'tls';dest.mkdir(parents=True,exist_ok=True)
key_path=dest/'server.key';cert_path=dest/'server.crt'
if key_path.exists() or cert_path.exists():raise SystemExit('Existing certificate detected; refusing overwrite')
key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
name=x509.Name([x509.NameAttribute(NameOID.COMMON_NAME,'PaperHD2D local test')])
now=datetime.datetime.now(datetime.timezone.utc)
cert=(x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(now-datetime.timedelta(minutes=1)).not_valid_after(now+datetime.timedelta(days=7)).add_extension(x509.SubjectAlternativeName([x509.DNSName('localhost'),x509.IPAddress(ipaddress.ip_address('127.0.0.1')),x509.IPAddress(ipaddress.ip_address('192.168.0.148'))]),critical=False).add_extension(x509.BasicConstraints(ca=False,path_length=None),critical=True).add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]),critical=False).sign(key,hashes.SHA256()))
key_path.write_bytes(key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
cert_path.write_bytes(cert.public_bytes(serialization.Encoding.PEM))
print('Created 7-day local TLS certificate and private key in ignored .godot/tls')
