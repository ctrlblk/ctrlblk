#!/bin/sh -ex

# Consume command line args
UBLOCK_REF=$1
UASSET_REF=$2
CTRLBLK_FILTERS_REF_OLD=$3
CTRLBLK_FILTERS_REF_NEW=$4

if [ ! -z $CTRLBLOCK_DEPLOY_TOKEN ]; then
    export GITHUB_TOKEN=$CTRLBLOCK_DEPLOY_TOKEN@;
    export GITHUB_BASE_URL="https://"$GITHUB_TOKEN"github.com/ctrlblk";
else
    export GITHUB_BASE_URL="git@github.com:ctrlblk";
fi

# Remember start so we can return at the end
START=$(pwd);

# Create a temporary working space
TMP=$(mktemp -d);
cd $TMP;

# Clone ctrlblk-filters
git clone $GITHUB_BASE_URL"/ctrlblk-filters.git"

cd ctrlblk-filters
git checkout -f $CTRLBLK_FILTERS_REF_NEW

# Build ctrlblk-filters list
npm install
npm run build

# Parse ad-report uuid from git log
git log $CTRLBLK_FILTERS_REF_OLD..$CTRLBLK_FILTERS_REF_NEW > ctrlblk-filters-log.txt
node $START/build/parse-ctrlblk-filters-log.mjs --input ctrlblk-filters-log.txt --output dist/ad-reports.json

# return back to temp dir
cd $TMP

# Clone uBO and export the files from the repo into a seperate folder
git clone $GITHUB_BASE_URL"/uBlock.git"
mkdir uBOL;
git -C uBlock archive $UBLOCK_REF | tar -x -C uBOL;
cd uBOL;

# TODO: use ctrlblk-filters from above
mkdir -p dist/build/mv3-data
cp $TMP/ctrlblk-filters/dist/ctrlblk-filters.txt dist/build/mv3-data/filters.ctrlblk.dev_ctrlblk-filters.txt
ls -liah dist/build/mv3-data/filters.ctrlblk.dev_ctrlblk-filters.txt

# Make uBO
make mv3-chromium;
ls -liah dist/build/mv3-data/

# return back to temp dir
cd $TMP;

# Copy uBO bits needed for DNR filter generation
mkdir uBOBits \
    uBOBits/lib \
    uBOBits/lib/regexanalyzer \
    uBOBits/lib/csstree \
    uBOBits/lib/publicsuffixlist/;

cp uBOL/src/js/text-utils.js uBOBits/
cp uBOL/src/js/static-dnr-filtering.js uBOBits/
cp uBOL/src/js/static-net-filtering.js uBOBits/
cp uBOL/src/js/tasks.js uBOBits/
cp uBOL/src/js/biditrie.js uBOBits/
cp uBOL/src/js/static-filtering-io.js uBOBits/
cp uBOL/src/js/static-filtering-parser.js uBOBits/
cp uBOL/src/js/uri-utils.js uBOBits/
cp uBOL/src/js/hntrie.js uBOBits/
cp uBOL/src/js/filtering-context.js uBOBits/
cp uBOL/src/js/static-filtering-io.js uBOBits/
cp uBOL/src/js/redirect-resources.js uBOBits/
cp uBOL/src/lib/punycode.js uBOBits/lib/
cp uBOL/src/lib/regexanalyzer/regex.js uBOBits/lib/regexanalyzer/
cp uBOL/src/lib/csstree/css-tree.js uBOBits/lib/csstree/
cp uBOL/src/lib/publicsuffixlist/publicsuffixlist.js uBOBits/lib/publicsuffixlist/

cp uBOL/platform/mv3/safe-replace.js uBOBits/
cp uBOL/platform/mv3/make-scriptlets.js uBOBits/
cp uBOL/assets/resources/scriptlets.js uBOBits/
cp -r uBOL/platform/mv3/scriptlets uBOBits/

# Tweak paths so we don't have to litter the project root with uBlock paths
# XXX: We use -i '' to make it work on both Linux and MacOS
# https://stackoverflow.com/questions/7573368/in-place-edits-with-sed-on-os-x
sed -i.orig -e 's/\.\.\/lib\//\.\/lib\//g' \
    uBOBits/static-filtering-parser.js \
    uBOBits/uri-utils.js
sed -i.orig -e 's/\.\/scriptlets\//\.\/uBOBits\/scriptlets\//g' \
    uBOBits/make-scriptlets.js

# Clone uAssets and export the files from the repo into a seperate folder
git clone $GITHUB_BASE_URL"/uAssets.git"
mkdir uAssets_;
git -C uAssets archive $UASSET_REF | tar -x -C uAssets_;
cd uAssets_;

# Build uAsset filter lists
./tools/make-ublock.sh

# return back to temp dir
cd $TMP;

# Go back to the start, copy the result and cleanup
cd $START;

# First remove targets from possible previous run
rm -rf uBOLite ctrlblk-filters uBOBits uAssets;

# Then copy the new results
ls $TMP/uBOL/dist/build/uBOLite.chromium
cp -vrf $TMP/uBOL/dist/build/uBOLite.chromium uBOLite;
cp -vrf $TMP/ctrlblk-filters/dist ctrlblk-filters;
cp -vrf $TMP/uAssets_ uAssets;
cp -vrf $TMP/uBOBits uBOBits;

# Finally cleanup
rm -vrf $TMP;