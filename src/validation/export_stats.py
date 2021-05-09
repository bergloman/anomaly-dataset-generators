import sys
import pandas as pd
import numpy as np

# determine file to analyze
args = sys.argv
filename=args[1]

# load data
df = pd.read_csv(filename)

# show basic info
print( df.describe())
print( df.cov())

# show correlations
cov = df.cov().to_numpy()
flattened = cov.flatten()
print(flattened)
