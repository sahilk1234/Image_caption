# Image Captioning Model

## Model Details
- **Architecture**: Transformer with ResNet50 encoder
- **Parameters**: 47,453,008
- **Vocabulary**: 10,000 tokens
- **Best BLEU-4**: 0.1006

## Files
- `config.json`: Model configuration
- `vocab.json`: Vocabulary mappings
- `weights.pt`: Model weights (use this for inference)
- `model_ts.pt`: TorchScript version (optional)

## Usage

```python
import torch
import json
from PIL import Image
import torchvision.transforms as transforms

# Load config
with open('config.json') as f:
    config = json.load(f)

# Load vocab
with open('vocab.json') as f:
    vocab_data = json.load(f)
    itos = vocab_data['itos']

# Load model
checkpoint = torch.load('weights.pt', map_location='cpu')
model = OptimizedCaptionNet(**config)
model.load_state_dict(checkpoint['model_state_dict'])
model.eval()

# Prepare image
transform = transforms.Compose([
    transforms.Resize((config['img_size'], config['img_size'])),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

img = Image.open('your_image.jpg').convert('RGB')
img_tensor = transform(img).unsqueeze(0)

# Generate caption
with torch.no_grad():
    output_ids = model.generate_beam(img_tensor, beam_size=3)
    
# Decode
caption = ' '.join([itos[idx] for idx in output_ids[0].tolist() 
                    if idx not in [config['pad_idx'], config['bos_idx'], config['eos_idx']]])
print(caption)
```

## Training Details
- Trained on MS-COCO dataset
- Optimizer: AdamW
- Learning Rate: 0.0003
- Batch Size: 128 (effective)
- Epochs: 19
