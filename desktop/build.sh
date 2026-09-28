#!/usr/bin/env bash
# Compila la app de escritorio y arma dist/DwellAirmagg.zip (jar + lanzador .bat).
set -euo pipefail
cd "$(dirname "$0")"
rm -rf build dist
mkdir -p build dist/DwellAirmagg
javac --release 17 -encoding UTF-8 -Xlint:all,-serial -d build src/airmagg/dwell/*.java
cp -r res/. build/
# FlatLaf (tema oscuro moderno) va dentro del jar
(cd build && unzip -qo ../lib/flatlaf-3.7.2.jar -x 'META-INF/*' 'module-info.class')
mkdir -p build/META-INF && cp lib/FLATLAF-LICENSE.txt build/META-INF/LICENSE-FlatLaf.txt
printf 'Main-Class: airmagg.dwell.Main\nImplementation-Title: Dwell airmaggnature\n' > build/manifest.txt
jar --create --file dist/DwellAirmagg/DwellAirmagg.jar --manifest build/manifest.txt -C build airmagg -C build com -C build META-INF
cp Abrir_Dwell_Airmagg.bat LEEME.txt dist/DwellAirmagg/
# Tambien el menu que abre el panel web (no necesita Java)
cp ../Abrir_Dwell_en_Tiempo_Real.bat dist/DwellAirmagg/Abrir_Panel_Web.bat
(cd dist && rm -f DwellAirmagg.zip && zip -qr DwellAirmagg.zip DwellAirmagg)
ls -la dist dist/DwellAirmagg
