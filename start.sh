#!/bin/bash
set -ex

if test ! -d gekko; then

git clone https://github.com/askmike/gekko -b stable

cd gekko
npm install --only=production
cd exchange
npm install --only=production
cd ..

sed -i "
s|headless: false|headless: true|
s|host: '127.0.0.1'|host: '0.0.0.0'|
s|host: 'localhost'|host: '"${myip}"'|
s|port: 3000|port: 80|g
" web/vue/dist/UIconfig.js
cd ..

fi

cd gekko
exec node gekko.js --ui

