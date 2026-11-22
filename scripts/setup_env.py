from pathlib import Path
import secrets


ROOT = Path(__file__).resolve().parent.parent


def create_env_file(template_path: Path, target_path: Path) -> bool:
    if target_path.exists():
        print(f"Keeping existing {target_path.relative_to(ROOT)}")
        return False

    content = template_path.read_text(encoding="utf-8")
    if target_path.name == ".env":
        content = content.replace(
            "SECRET_KEY=GENERATE_ON_SETUP",
            f"SECRET_KEY={secrets.token_urlsafe(32)}",
        )

    target_path.write_text(content, encoding="utf-8")
    print(f"Created {target_path.relative_to(ROOT)}")
    return True


def main() -> None:
    create_env_file(ROOT / "backend" / ".env.example", ROOT / "backend" / ".env")
    create_env_file(
        ROOT / "frontend" / ".env.example",
        ROOT / "frontend" / ".env.local",
    )
    print("Local environment setup complete. Existing env files were not overwritten.")


if __name__ == "__main__":
    main()
