#!/bin/bash

rm -Rf data
rm -Rf public
node build_library.js
if [[ $? != 0 ]]; then
  echo "Error in build_library.js"
  exit 1
fi

node hugo.js generate
if [[ $? != 0 ]]; then
  echo "Error in Hugo generate"
  exit 1
fi

node check_index.js
if [[ $? != 0 ]]; then
  echo "Error in check_index.js"
  exit 1
fi

hugo --ignoreCache --logLevel debug
