import sys
import pandas as pd
import numpy as np
from scipy.stats import ks_2samp

# determine file to analyze
args = sys.argv
filename=args[1]

# load data
df = pd.read_csv(filename)

# show basic info
print(df.describe())
print(df.cov())

# show correlations
cov = df.cov().to_numpy()
flattened = cov.flatten()
print(flattened)

df_flattened = pd.DataFrame(data=flattened, index=None, columns=None)
print(df_flattened.describe())

#df_flattened.hist()

# bins = pd.cut(flattened, 10)
# print(bins)


# bins = np.linspace(-0.06, 0.20, 27)

# real-world data
coors_real = [
    0.00357827  ,0.00188209 , 0.00096201,  0.00133107 , 0.00077615 , 0.00941439,
    0.0015439  , 0.00188209,  0.02771082,  0.00483988 , 0.00209155, 0.00133739,
    0.0182181  , 0.00209128 , 0.00096201,  0.00483988 , 0.0044537  , 0.00115172,
    0.00069038 , 0.00431364 , 0.00135829,  0.00133107 , 0.00209155,  0.00115172,
    0.00293511 , 0.00120762 , 0.00552064, -0.00307586 , 0.00077615,  0.00133739,
    0.00069038 , 0.00120762 , 0.0006916 ,  0.00307788 , 0.00018863,  0.00941439,
    0.0182181  , 0.00431364 , 0.00552064,  0.00307788 , 0.06773367,  0.01707314,
    0.0015439  , 0.00209128 , 0.00135829, -0.00307586 , 0.00018863,  0.01707314,
    0.08581968
]
df_real = pd.DataFrame(data=coors_real, index=None, columns=None)
print(df_real.describe())
# df = pd.DataFrame(coors_real)

# coors2=[
# 0.14035631, 0.01517438, 0.01264212, -0.05680938, 0.12665161, 0.12563621,
# 0.01883883, 0.01517438, 0.00779739, 0.00206412, -0.0059366, 0.01446183,
# 0.0162875, 0.00274649, 0.01264212, 0.00206412, 0.01065064, -0.0049415,
# 0.01047045, 0.0124878, 0.00228911, -0.05680938, -0.0059366, -0.0049415,
# 0.08412537, -0.04777528, -0.04872575, -0.00867405, 0.12665161, 0.01446183,
# 0.01047045, -0.04777528, 0.15838961, 0.13610397, 0.01658216, 0.12563621,
# 0.0162875, 0.0124878, -0.04872575, 0.13610397, 0.16425802, 0.0182263,
# 0.01883883, 0.00274649, 0.00228911, -0.00867405, 0.01658216, 0.0182263,
# 0.01868724
# ]
coors2 = flattened
# df2 = pd.DataFrame(coors2)


# Tests

test_res = ks_2samp(coors_real, coors2)
print(test_res)
