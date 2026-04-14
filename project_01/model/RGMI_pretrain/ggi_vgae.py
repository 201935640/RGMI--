import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GCNConv, VGAE
from torch_geometric.utils import train_test_split_edges

class VGAEEncoder(nn.Module):
    def __init__(self, in_channels, hidden_channels, out_channels):
        super(VGAEEncoder, self).__init__()
        # 按照指南建议：使用 2 层 GCNConv
        self.conv1 = GCNConv(in_channels, hidden_channels)
        self.conv_mu = GCNConv(hidden_channels, out_channels)
        self.conv_logstd = GCNConv(hidden_channels, out_channels)

    def forward(self, x, edge_index):
        x = self.conv1(x, edge_index).relu()
        return self.conv_mu(x, edge_index), self.conv_logstd(x, edge_index)

def build_vgae_model(num_features, out_channels=128):
    """
    Build the VGAE model as per Day 2 requirements.
    - Encoder: 2-layer GCN
    - Hidden/Output dimension: fixed to 128
    """
    hidden_channels = 128 # Fixed to 128 as per guide
    encoder = VGAEEncoder(num_features, hidden_channels, out_channels)
    model = VGAE(encoder)
    return model

if __name__ == "__main__":
    # Test building the model
    # Project has 17247 genes, and we extracted 128D initial features
    NUM_GENES = 17247
    FEAT_DIM = 128
    OUT_DIM = 128
    
    model = build_vgae_model(FEAT_DIM, OUT_DIM)
    print(f"VGAE Model built successfully.")
    print(f"Encoder structure:\n{model.encoder}")
    
    # Mock data to verify forward pass
    x = torch.randn(NUM_GENES, FEAT_DIM)
    edge_index = torch.randint(0, NUM_GENES, (2, 1000))
    
    mu = model.encode(x, edge_index)
    print(f"Output embedding shape: {mu.shape}")
    assert mu.shape == (NUM_GENES, OUT_DIM)
    print("[PASS] Forward pass verified.")
