#!/bin/bash

node build_library.js
node hugo.js generate
node check_index.js
hugo server
