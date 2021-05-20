#! /bin/bash
set -e

#########################################################################
# This script generates parking dataset in CSV format
#########################################################################

# generate parking parameters

echo "Generating parking parameters..."
cd params/params_parking/source
node generator_parking_lot.js
cd ../../..

# generate data form params

echo "Generating data from parameters..."

TYPES=("type-ber")
SOURCES=("moderate")
NORMALIZE_TAGS=("no")
GENERATOR="parking"

for NORMALIZE_TAG in "${NORMALIZE_TAGS[@]}"
do
    for TYPE in "${TYPES[@]}"
    do
        NORMALIZE=""
        DIR_POSTFIX=""
        if [ $NORMALIZE_TAG == "yes" ]; then NORMALIZE="--normalize_hours"; fi
        if [ $NORMALIZE_TAG == "yes" ]; then DIR_POSTFIX="_normalized_hours"; fi
        DIR=data_$GENERATOR/csv$DIR_POSTFIX/$TYPE
        mkdir -p $DIR
        for SOURCE in "${SOURCES[@]}"
        do
            rm -rf $DIR/$SOURCE.$TYPE.csv*
            echo "Preparing $GENERATOR $SOURCE $TYPE $NORMALIZE csv file"
            node build/main.js \
                --generator $GENERATOR \
                -t csv \
                --skip_timestamp \
                -f params/params_$GENERATOR/$TYPE/params.$SOURCE.$TYPE.json \
                -o $DIR/$SOURCE.$TYPE.csv \
                $NORMALIZE
        done
    done
done

# Now get statistics and compare them

echo "Getting statistics..." 

python src/validation/export_stats.py data_parking/csv/type-ber/moderate.type-ber.csv

echo "Finished."
