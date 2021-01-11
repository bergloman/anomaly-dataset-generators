#! /bin/bash

#########################################################################
# This script generates datacenter datasets in CSV format
#########################################################################

TYPES=("type-b" "type-e" "type-r" "type-be" "type-br" "type-er" "type-ber")
SOURCES=("complex" "moderate" "simple" "single" "flat")
NORMALIZE_TAGS=("yes" "no")
GENERATOR="parking"

# TYPES=("type-b")
# SOURCES=("flat")
# NORMALIZE_TAGS=("yes")

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

echo "Finished."
