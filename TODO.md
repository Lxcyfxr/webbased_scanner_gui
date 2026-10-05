# Tool Integration TODO

## Reconnaissance
- [ ] **Nikto** — Web-Server-Scanner, findet veraltete Software, gefährliche Dateien, Fehlkonfigurationen
- [ ] **whatweb** — Web-Tech-Fingerprinting (CMS, Frameworks, Server-Version)
- [ ] **theHarvester** — E-Mails, Subdomains, Hosts aus öffentlichen Quellen sammeln

## Port / Service
- [ ] **Masscan** — extrem schneller Port-Scanner (ergänzt nmap für große Netze)
- [ ] **Netcat / ncat** — einfache Verbindungstests, Banner-Grabbing

## Web / Directory
- [ ] **Nuclei** — Template-basierter Vulnerability-Scanner, riesige Community-Datenbank
- [ ] **sqlmap** — automatisierte SQL-Injection-Erkennung und -Exploitation
- [ ] **wfuzz** — Alternative zu ffuf, sehr flexibel

## Password / Auth
- [ ] **Hydra** — Brute-Force für SSH, FTP, HTTP, RDP, etc.
- [ ] **Hashcat / John the Ripper** — Offline-Passwort-Cracking

## Netzwerk / Traffic
- [ ] **tcpdump** — Packet-Capture direkt aus der GUI starten
- [ ] **Responder** — LLMNR/NBT-NS Poisoning im internen Netz

## Priorität (nächste Schritte)
1. [x] **Nikto** — einfach zu integrieren, direkte XML-Ausgabe
2. [ ] **Nuclei** — sehr mächtig, JSON-Output, viele Templates
3. [ ] **Hydra** — passt gut zu den bestehenden Fuzzing-Tools
4. [ ] **sqlmap** — logische Erweiterung nach dem Directory-Fuzzing
