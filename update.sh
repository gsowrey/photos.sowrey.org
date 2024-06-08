#!/bin/bash

rm -Rf data
rm -Rf public
node build_library.js
node hugo.js generate
node check_index.js
hugo --ignoreCache --logLevel debug
