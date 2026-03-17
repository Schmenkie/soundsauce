"""
Export EfficientAT mn04_as to ONNX format for browser inference.

This script:
1. Clones the EfficientAT repo (if needed)
2. Loads the mn04_as pretrained model
3. Wraps the mel spectrogram preprocessor + model into a single module
4. Exports to ONNX with raw audio as input, sigmoid class scores as output
5. Also exports the AudioSet class labels as JSON

Usage:
    pip install torch torchaudio onnx
    python scripts/export_efficientat.py

Output:
    scripts/mn04_as.onnx          (~3-4MB ONNX model)
    scripts/audioset_labels.json  (527 class labels)
"""

import os
import sys
import json
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.join(SCRIPT_DIR, "EfficientAT")
OUTPUT_ONNX = os.path.join(SCRIPT_DIR, "mn04_as.onnx")
OUTPUT_LABELS = os.path.join(SCRIPT_DIR, "audioset_labels.json")


def ensure_repo():
    """Clone EfficientAT repo if not already present."""
    if os.path.exists(REPO_DIR):
        print(f"EfficientAT repo already exists at {REPO_DIR}")
        return
    print("Cloning EfficientAT repository...")
    subprocess.run(
        ["git", "clone", "https://github.com/fschmid56/EfficientAT.git", REPO_DIR],
        check=True,
    )
    print("Clone complete.")


def export_model():
    """Load mn04_as and export to ONNX."""
    # Change to repo directory so relative paths work (metadata/class_labels_indices.csv)
    original_cwd = os.getcwd()
    os.chdir(REPO_DIR)

    # Add EfficientAT to Python path so we can import its modules
    sys.path.insert(0, REPO_DIR)

    import torch
    import torch.nn as nn

    # Import EfficientAT modules
    from models.mn.model import get_model
    from models.preprocess import AugmentMelSTFT
    from helpers.utils import NAME_TO_WIDTH

    print("Loading mn04_as model...")

    # Model config matching inference.py defaults
    model_name = "mn04_as"
    sample_rate = 32000
    window_size = 800
    hop_size = 320
    n_fft = 1024
    n_mels = 128
    num_classes = 527

    # Get width multiplier for mn04
    width = NAME_TO_WIDTH(model_name)
    print(f"  Width multiplier: {width}")

    # Create mel spectrogram preprocessor (eval mode — no augmentation)
    mel = AugmentMelSTFT(
        n_mels=n_mels,
        sr=sample_rate,
        win_length=window_size,
        hopsize=hop_size,
        n_fft=n_fft,
    )
    mel.eval()

    # Create classification model
    model = get_model(
        width_mult=width,
        pretrained_name=model_name,
        num_classes=num_classes,
        head_type="mlp",
    )
    model.eval()

    print(f"  Model parameters: {sum(p.numel() for p in model.parameters()):,}")

    # Create a wrapper module that combines preprocessing + model
    class EfficientATWrapper(nn.Module):
        def __init__(self, mel_module, classification_model):
            super().__init__()
            self.mel = mel_module
            self.model = classification_model

        def forward(self, audio):
            """
            Args:
                audio: [batch, num_samples] raw audio at 32kHz

            Returns:
                scores: [batch, 527] sigmoid scores
            """
            # Generate mel spectrogram
            mel_spec = self.mel(audio)  # [batch, n_mels, time]
            mel_spec = mel_spec.unsqueeze(1)  # [batch, 1, n_mels, time]

            # Run classification
            logits, _ = self.model(mel_spec)  # [batch, 527]

            # Apply sigmoid (multi-label classification)
            scores = torch.sigmoid(logits)

            return scores

    wrapper = EfficientATWrapper(mel, model)
    wrapper.eval()

    # Create dummy input: 10 seconds of audio at 32kHz
    dummy_input = torch.randn(1, sample_rate * 10)

    print("Testing forward pass...")
    with torch.no_grad():
        test_output = wrapper(dummy_input)
    print(f"  Output shape: {test_output.shape}")  # Should be [1, 527]
    print(f"  Score range: [{test_output.min().item():.4f}, {test_output.max().item():.4f}]")

    # Export to ONNX
    print(f"Exporting to ONNX: {OUTPUT_ONNX}")
    torch.onnx.export(
        wrapper,
        dummy_input,
        OUTPUT_ONNX,
        input_names=["audio"],
        output_names=["scores"],
        dynamic_axes={
            "audio": {0: "batch", 1: "num_samples"},
            "scores": {0: "batch"},
        },
        opset_version=17,
        do_constant_folding=True,
    )

    # Check file size
    file_size_mb = os.path.getsize(OUTPUT_ONNX) / (1024 * 1024)
    print(f"  ONNX file size: {file_size_mb:.1f} MB")

    # Verify ONNX model
    try:
        import onnx

        onnx_model = onnx.load(OUTPUT_ONNX)
        onnx.checker.check_model(onnx_model)
        print("  ONNX model verification: PASSED")
    except ImportError:
        print("  (onnx package not installed, skipping verification)")
    except Exception as e:
        print(f"  ONNX verification warning: {e}")

    # Restore original working directory
    os.chdir(original_cwd)
    return True


def export_labels():
    """Export AudioSet class labels to JSON."""
    sys.path.insert(0, REPO_DIR)

    labels_csv = os.path.join(REPO_DIR, "helpers", "audiset_lbs.csv")
    if not os.path.exists(labels_csv):
        # Try alternate path
        labels_csv = os.path.join(REPO_DIR, "helpers", "audioset_lbs.csv")

    if not os.path.exists(labels_csv):
        print(f"Warning: AudioSet labels CSV not found. Searching...")
        # Search for any CSV with labels
        for root, dirs, files in os.walk(REPO_DIR):
            for f in files:
                if f.endswith(".csv") and ("label" in f.lower() or "lbs" in f.lower()):
                    labels_csv = os.path.join(root, f)
                    print(f"  Found: {labels_csv}")
                    break

    if not os.path.exists(labels_csv):
        print("ERROR: Could not find AudioSet labels CSV")
        print("You can download it from: https://raw.githubusercontent.com/qiuqiangkong/audioset_tagging_cnn/master/metadata/class_labels_indices.csv")
        return False

    # Parse CSV (format varies: could be "index,label" or "index,mid,display_name")
    labels = {}
    with open(labels_csv, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or line.startswith("index"):
                continue
            parts = line.split(",")
            if len(parts) >= 2:
                try:
                    idx = int(parts[0].strip().strip('"'))
                    # Last part is usually the display name
                    name = parts[-1].strip().strip('"')
                    labels[str(idx)] = name
                except ValueError:
                    continue

    with open(OUTPUT_LABELS, "w") as f:
        json.dump(labels, f, indent=2)

    print(f"Exported {len(labels)} class labels to {OUTPUT_LABELS}")
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("EfficientAT mn04_as → ONNX Export")
    print("=" * 60)
    print()

    # Step 1: Get the repo
    ensure_repo()
    print()

    # Step 2: Export model
    success = export_model()
    if not success:
        sys.exit(1)
    print()

    # Step 3: Export labels
    export_labels()
    print()

    print("=" * 60)
    print("DONE!")
    print(f"  Model: {OUTPUT_ONNX}")
    print(f"  Labels: {OUTPUT_LABELS}")
    print()
    print("Next steps:")
    print("  1. Upload mn04_as.onnx to Vercel Blob")
    print("  2. Update MODEL_URL in src/services/mlInstrumentDetection.js")
    print("=" * 60)
