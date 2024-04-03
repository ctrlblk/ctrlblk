#!/bin/sh -ex

# Consume command line args
UBLOCK_REF=$1
CTRLBLK_FILTERS_REF_OLD=$2
CTRLBLK_FILTERS_REF_NEW=$3

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

# Go back to the start, copy the result and cleanup
cd $START;
rm -rf uBOLite ctrlblk-filters;
cp -vrf $TMP/uBOL/dist/build/uBOLite.chromium uBOLite;
cp -vrf $TMP/ctrlblk-filters/dist ctrlblk-filters;
rm -vrf $TMP;
