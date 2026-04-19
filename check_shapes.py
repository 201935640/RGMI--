import numpy as np
from scipy import sparse
import os

path = 'project_01/backend/Dataset'
files = ['d2g.npz', 'hnet.npz', 'miRNA2disease.npz']

for f in files:
    p = os.path.join(path, f)
    if os.path.exists(p):
        try:
            m = sparse.load_npz(p)
            print(f"{f}: {m.shape}")
        except Exception as e:
            print(f"Error loading {f}: {e}")
            try:
                loader = np.load(p)
                print(f"{f} keys: {list(loader.keys())}")
                if 'shape' in loader:
                    print(f"{f} shape from loader: {loader['shape']}")
            except:
                print(f"Failed to inspect {f} manually")
    else:
        print(f"{f} not found")
