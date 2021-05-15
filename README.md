# Anomaly-dataset generators

Generator of industry-inspired datasets with injected anomalies.

# Preparation

Prepare the environment by installing `typescript` tool globally

```bash
npm install -g typescript
```

Install the dependencies and compile the source-code.

```bash
npm install
npm run build
```

# Running the generators

This library provides two generators:

- datacenter
- parking

## Configuration files

Each generator accepts configuration files that are specific to the generator.
These files define both the general parameters for each domain as well as anomalies that should be injected.

Configuration files are located in directories `params/params_<TYPE>/<ANOMALY>`.

To prepare datasets with different sizes and anomaly types we performed simple pre-processing:

- We created 4 different configurations with increasing complexity: (single, simple, moderate, complex)
- Additionaly we created a configuration file that instructs the preprocessor which anomaly combinations to inject (e.g. type1, type2, type3, type12, type13, type23, type123) and how many of them.
- Simple script creates final configuration files by taking basic configuration (e.g. moderate) and injecting anomaly definitions into them (e.g. type1+type3).
- This simple procedure generates 4x7=28 different configuration files.

```bash
cd params/params_datacenter/source
node generator_datacenter.js

cd params/params_parking/source
node generator_parking_lot.js
```

The configuration file we produced in the above steps are now the input for the dataset generator, which simulates the problem domain and injects the anomalies into it.
