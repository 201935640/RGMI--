import os
import requests
import gzip
import pandas as pd
import numpy as np
import torch
from tqdm import tqdm
import time

# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------
DATASET_DIR = r'c:\Users\D\Desktop\RGMI\project_01\model\RGMI_pretrain\Dataset'
STRING_URL = "https://string-db.org/api/tsv/get_string_ids" # We'll use this for mapping if needed
STRING_LINKS_URL = "https://stringdb-static.org/download/protein.links.v12.0/9606.protein.links.v12.0.txt.gz"
PROCESSED_DIR = os.path.join(DATASET_DIR, 'processed_v2')
CHECKPOINT_PATH = r'c:\Users\D\Desktop\RGMI\project_01\model\RGMI_pretrain\checkpoint_60.pth.tar'

if not os.path.exists(PROCESSED_DIR):
    os.makedirs(PROCESSED_DIR)

def load_gene_mapping():
    """Load gene2id.txt to establish Entrez ID -> Sequential Index mapping."""
    gene2id = {}
    file_path = os.path.join(DATASET_DIR, 'gene2id.txt')
    with open(file_path, 'r') as f:
        lines = f.readlines()
        for line in lines[1:]:
            parts = line.strip().split()
            if len(parts) == 2:
                # Entrez ID -> Index
                gene2id[parts[0]] = int(parts[1])
    return gene2id

def download_string_data(dest_path):
    """Download STRING human protein interaction data."""
    if os.path.exists(dest_path):
        print(f"STRING data already exists at {dest_path}")
        return
    
    print(f"Downloading STRING data from {STRING_LINKS_URL}...")
    response = requests.get(STRING_LINKS_URL, stream=True)
    with open(dest_path, 'wb') as f:
        for chunk in tqdm(response.iter_content(chunk_size=8192)):
            f.write(chunk)
    print("Download complete.")

def get_ensembl_to_entrez_mapping(ensembl_ids):
    """
    Use MyGene.info API to map Ensembl Protein IDs (ENSP) to Entrez IDs.
    Batch process to avoid hitting limits.
    """
    print(f"Mapping {len(ensembl_ids)} ENSP IDs to Entrez IDs via MyGene.info...")
    url = "https://mygene.info/v3/query"
    mapping = {}
    
    # Process in batches of 1000
    batch_size = 1000
    ensembl_list = list(ensembl_ids)
    
    for i in range(0, len(ensembl_list), batch_size):
        batch = ensembl_list[i:i+batch_size]
        # Clean ENSP IDs (sometimes they have '9606.' prefix)
        query_ids = [eid.replace('9606.', '') if eid.startswith('9606.') else eid for eid in batch]
        
        payload = {
            "q": ",".join(query_ids),
            "scopes": "ensembl.protein",
            "fields": "entrezgene",
            "species": "human"
        }
        
        try:
            response = requests.post(url, data=payload)
            results = response.json()
            
            for res in results:
                if 'entrezgene' in res:
                    # Map original ENSP ID to Entrez ID (as string)
                    orig_id = batch[query_ids.index(res['query'])]
                    mapping[orig_id] = str(res['entrezgene'])
        except Exception as e:
            print(f"Error mapping batch {i}: {e}")
        
        time.sleep(0.1) # Respectful delay
        
    print(f"Successfully mapped {len(mapping)} IDs.")
    return mapping

def preprocess_enhanced():
    # 1. Load Anchors
    gene2id = load_gene_mapping()
    entrez_ids_in_project = set(gene2id.keys())
    print(f"Anchor: {len(gene2id)} genes from project loaded.")

    # 2. Handle STRING Data
    string_file = os.path.join(DATASET_DIR, '9606.protein.links.v12.0.txt.gz')
    download_string_data(string_file)

    print("Loading and filtering STRING data...")
    df = pd.read_csv(string_file, sep=' ', compression='gzip')
    
    # Filter high-confidence edges (score > 700)
    df_high = df[df['combined_score'] > 700].copy()
    print(f"Filtered to {len(df_high)} high-confidence edges.")

    # 3. ID Mapping
    # Get unique ENSP IDs from filtered edges
    unique_ensp = set(df_high['protein1']).union(set(df_high['protein2']))
    ensp_to_entrez = get_ensembl_to_entrez_mapping(unique_ensp)

    # Map edges to project indices
    rows, cols = [], []
    skipped_mapping = 0
    skipped_project = 0
    
    print("Aligning STRING edges with project IDs...")
    for _, row in tqdm(df_high.iterrows(), total=len(df_high)):
        p1, p2 = row['protein1'], row['protein2']
        
        entrez1 = ensp_to_entrez.get(p1)
        entrez2 = ensp_to_entrez.get(p2)
        
        if not entrez1 or not entrez2:
            skipped_mapping += 1
            continue
            
        if entrez1 not in entrez_ids_in_project or entrez2 not in entrez_ids_in_project:
            skipped_project += 1
            continue
            
        rows.append(gene2id[entrez1])
        cols.append(gene2id[entrez2])

    print(f"Skipped {skipped_mapping} edges due to missing Entrez mapping.")
    print(f"Skipped {skipped_project} edges because genes are not in project gene2id.txt.")
    
    ggi_edge_index = torch.tensor([rows, cols], dtype=torch.long)
    # Ensure undirected
    ggi_edge_index = torch.cat([ggi_edge_index, ggi_edge_index.flip(0)], dim=1)
    ggi_edge_index = torch.unique(ggi_edge_index, dim=1)
    
    print(f"Final Enhanced GGI Edges: {ggi_edge_index.shape[1]}")
    torch.save(ggi_edge_index, os.path.join(PROCESSED_DIR, 'enhanced_ggi_edge_index.pt'))

    # 4. Process Disease-Gene Interactions (DGI) - Anchored to project mappings
    print("Processing Disease-Gene Interactions (DGI) from d2g.npz...")
    dis2id = {}
    with open(os.path.join(DATASET_DIR, 'dis2id.txt'), 'r') as f:
        lines = f.readlines()
        for line in lines[1:]:
            parts = line.strip().split()
            if len(parts) == 2:
                dis2id[parts[0]] = int(parts[1])

    d2g_data = np.load(os.path.join(DATASET_DIR, 'd2g.npz'))
    d2g_rows = d2g_data['row'] # Diseases
    d2g_cols = d2g_data['col'] # Genes
    
    # Validate and save DGI
    dgi_edge_index = torch.tensor([d2g_rows, d2g_cols], dtype=torch.long)
    print(f"Final DGI Edges: {dgi_edge_index.shape[1]}")
    torch.save(dgi_edge_index, os.path.join(PROCESSED_DIR, 'dgi_edge_index.pt'))

    # 5. Extract Initial Features (Embeddings from g_encoder)
    print("Extracting initial features from checkpoint...")
    checkpoint = torch.load(CHECKPOINT_PATH, map_location='cpu')
    sd = checkpoint['model_state_dict']
    
    # The g_encoder.conv1.lin.weight is [128, 17247]
    # This represents the projection of one-hot encoded genes to 128D
    # We can use the transpose of this weight as initial features
    initial_features = sd['g_encoder.conv1.lin.weight'].t()
    print(f"Extracted features shape: {initial_features.shape}")
    torch.save(initial_features, os.path.join(PROCESSED_DIR, 'initial_features.pt'))

    print(f"Preprocessing complete. Files saved in {PROCESSED_DIR}")

if __name__ == "__main__":
    preprocess_enhanced()
