from pathlib import Path

REQUIRED_FRAGMENTS = {
    "current truth includes admitted asset read-only": (
        "`asset.processor.status`, `asset.source.inspect`, `render.capture.viewport`,"
    ),
    "current truth includes admitted plan-only slices": (
        "`asset.batch.process`, `asset.move.safe`, `render.shader.rebuild`,"
    ),
    "current truth includes admitted mutation-gated slices": (
        "`gem.enable` and `render.material.patch` are admitted narrow mutation-gated"
    ),
    "editor exists direct proof is represented": (
        "`editor.entity.exists` and `editor.component.property.get` are admitted"
    ),
    "gem enable is admitted": (
        "| `gem.enable` | project / config / settings / Gem automation | "
        "Admitted narrow mutation-gated real path"
    ),
    "gem disable remains unadmitted": (
        "| `gem.disable` | project / config / settings / Gem automation | "
        "Not yet admitted as real"
    ),
    "entity exists row is explicit": (
        "| `editor.entity.exists` | editor session / level / entity / component "
        "automation | Admitted hybrid read-only path"
    ),
    "asset read-only row is explicit": (
        "| `asset.processor.status` / `asset.source.inspect` | asset processor"
    ),
    "asset plan-only row is explicit": (
        "| `asset.batch.process` / `asset.move.safe` | asset processor"
    ),
    "render read-only row is explicit": (
        "| `render.capture.viewport` / `render.material.inspect` | rendering"
    ),
    "render shader plan-only row is explicit": (
        "| `render.shader.rebuild` | rendering / material / capture automation | "
        "Admitted real plan-only"
    ),
    "render material patch row is explicit": (
        "| `render.material.patch` | rendering / material / capture automation | "
        "Admitted narrow mutation-gated real path"
    ),
    "visual diff row is explicit": (
        "| `test.visual.diff` | validation / TIAF / native / Python / visual diff"
    ),
    "validation plan-only row is explicit": (
        "| `test.run.gtest` / `test.run.editor_python` / `test.tiaf.sequence` | "
        "validation"
    ),
    "execution-gated label remains represented": "- real execution-gated",
    "editor-authoring label remains represented": "- real editor-authoring/runtime",
}


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    matrix_path = repo_root / "docs" / "REMOTE-AUTOMATION-SURFACE-MATRIX.md"
    matrix_text = matrix_path.read_text(encoding="utf-8")

    missing = [
        f"{label}: {fragment}"
        for label, fragment in REQUIRED_FRAGMENTS.items()
        if fragment not in matrix_text
    ]
    if missing:
        print("Surface matrix drift check failed.")
        print(f"Checked: {matrix_path}")
        for item in missing:
            print(f"- missing {item}")
        return 1

    print("Surface matrix drift check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
