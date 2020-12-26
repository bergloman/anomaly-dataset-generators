#! /bin/bash

TYPES=("type-b" "type-e" "type-r" "type-be" "type-br" "type-er" "type-ber")
SOURCES=("complex" "moderate" "simple" "single")

# TYPES=("type-ber")
# SOURCES=("complex")

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

echo "Printing final file sizes:"
for FILE in $(find data_parking/csv -name '*.csv'); do
    ANOMS=$(grep anomaly $FILE | wc -l)
    LINES=$(wc -l $FILE)
    echo "$FILE lines=$LINES anomalies=$ANOMS"
done
for FILE in $(find data_parking/csv_normalized_hours -name '*.csv'); do
    ANOMS=$(grep anomaly $FILE | wc -l)
    LINES=$(wc -l $FILE)
    echo "$FILE lines=$LINES anomalies=$ANOMS"
done

echo "Finished."
