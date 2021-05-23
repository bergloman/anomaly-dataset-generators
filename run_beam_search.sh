#! /bin/bash
set -e

#########################################################################
# This script generates parking dataset in CSV format
#########################################################################

GENERATOR="parking"
NORMALIZE="no"
EXPANSION_FACTOR_INITIAL=100
EXPANSION_FACTOR_STANDARD=10
TIMESTAMP=$(date +%Y-%m-%dT%H-%M-%S)

ROOT_DIR=params/params_parking/source

TMP_DIR=$ROOT_DIR/tmp
INPUT_DIR=$TMP_DIR/input
OUTPUT_DIR=$TMP_DIR/output-$TIMESTAMP
DATA_DIR=$TMP_DIR/data-$TIMESTAMP
RES_FILE=$TMP_DIR/res-$TIMESTAMP.txt

mkdir -p $INPUT_DIR
mkdir -p $OUTPUT_DIR
mkdir -p $DATA_DIR

# run initial expansion
function run_initial_expansion() {
    node $ROOT_DIR/generator_of_permuted_settings \
        --input_file $ROOT_DIR/params.moderate.json \
        --output_dir $OUTPUT_DIR \
        --expand_factor $EXPANSION_FACTOR_INITIAL
}

function expand_beam() {
    for FILE in $INPUT_DIR/*.json; do
        node $ROOT_DIR/generator_of_permuted_settings \
            --input_file $FILE \
            --output_dir $OUTPUT_DIR \
            --expand_factor $EXPANSION_FACTOR_STANDARD
    done
}

function perform_evaluation() {
    for FILE in $OUTPUT_DIR/*.json; do
        FILENAME=$(basename -- "$FILE")
        OUT_FILE=$DATA_DIR/$FILENAME.csv

        echo "Preparing $OUT_FILE"
        rm -rf $OUT_FILE*

        node build/main.js \
            --generator $GENERATOR \
            -t csv \
            --skip_timestamp \
            -f $FILE \
            -o $OUT_FILE \
            $NORMALIZE

        # run python to evaluate the dataset and write the result
        echo "$OUT_FILE" >> $RES_FILE
        python src/validation/export_stats.py $OUT_FILE >> $RES_FILE
    done
}

# run_initial_expansion
# perform_evaluation

# expand_beam
# perform_evaluation

# perform final evaluation on full-year data
ROOT_DIR2=params/params_parking/candidates
OUTPUT_DIR=$ROOT_DIR2
DATA_DIR=$ROOT_DIR2/tmp/data
RES_FILE=$ROOT_DIR2/tmp/res.txt
mkdir -p $OUTPUT_DIR
mkdir -p $DATA_DIR
perform_evaluation

echo "Finished."
