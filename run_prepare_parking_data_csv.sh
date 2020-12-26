#! /bin/bash

#########################################################################
# This script generates dataenter datasets in CSV format
#########################################################################

TYPES=("type-b" "type-e" "type-r" "type-be" "type-br" "type-er" "type-ber")
SOURCES=("complex" "moderate" "simple" "single")

for TYPE in "${TYPES[@]}"
do
    DIR=data_parking/csv/$TYPE
    mkdir -p $DIR

    for SOURCE in "${SOURCES[@]}"
    do
        rm $DIR/$SOURCE.$TYPE.csv*
        echo "Preparing $SOURCE $TYPE csv file"
        node build/main.js \
            --generator parking \
            -t csv \
            -f params_parking/$TYPE/params.$SOURCE.$TYPE.json \
            -o $DIR/$SOURCE.$TYPE.csv \
            --skip_timestamp
    done
done

for TYPE in "${TYPES[@]}"
do
    DIR=data_parking/csv_normalized_hours/$TYPE
    mkdir -p $DIR

    for SOURCE in "${SOURCES[@]}"
    do
        rm $DIR/$SOURCE.$TYPE.csv*
        echo "Preparing $SOURCE $TYPE csv file"
        node build/main.js \
            --generator parking \
            -t csv \
            -f params_parking/$TYPE/params.$SOURCE.$TYPE.json \
            -o $DIR/$SOURCE.$TYPE.csv \
            --skip_timestamp --normalize_hours
    done
done

echo "Finished."
