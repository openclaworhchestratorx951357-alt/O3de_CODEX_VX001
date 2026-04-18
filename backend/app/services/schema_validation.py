import json
from pathlib import Path
from typing import Any

from app.models.api import SchemaValidationStatus


REPO_ROOT = Path(__file__).resolve().parents[3]


class SchemaValidationService:
    def get_capability_status(self) -> SchemaValidationStatus:
        return SchemaValidationStatus(
            mode="subset-json-schema",
            supports_request_args=True,
            supports_result_conformance=True,
            supported_keywords=[
                "$ref",
                "allOf",
                "type",
                "required",
                "properties",
                "additionalProperties",
                "enum",
                "const",
                "minLength",
                "minItems",
                "minProperties",
                "minimum",
                "maximum",
                "items",
            ],
            supported_refs=["relative local schema refs only"],
            unsupported_keywords=[
                "anyOf",
                "oneOf",
                "not",
                "pattern",
                "format",
                "exclusiveMinimum",
                "exclusiveMaximum",
                "uniqueItems",
                "patternProperties",
                "dependentRequired",
            ],
            notes=[
                "Validation coverage is intentionally limited to the subset used by the published tool arg/result schemas.",
                "The validator does not claim full JSON Schema support.",
                "Simulated result conformance checks validate the current simulated dispatch payload shape, not real O3DE adapter outputs.",
            ],
        )

    def load_schema(self, schema_ref: str) -> dict[str, Any]:
        schema_path = REPO_ROOT / schema_ref
        return json.loads(schema_path.read_text(encoding="utf-8"))

    def validate_tool_args(
        self,
        *,
        schema_ref: str,
        payload: dict[str, Any],
    ) -> list[str]:
        schema = self.load_schema(schema_ref)
        schema_path = REPO_ROOT / schema_ref
        errors: list[str] = []
        self._validate_node(payload, schema, schema_path, "$", errors)
        return errors

    def validate_tool_result(
        self,
        *,
        schema_ref: str,
        payload: dict[str, Any],
    ) -> list[str]:
        schema = self.load_schema(schema_ref)
        schema_path = REPO_ROOT / schema_ref
        errors: list[str] = []
        self._validate_node(payload, schema, schema_path, "$", errors)
        return errors

    def _validate_node(
        self,
        value: Any,
        schema: dict[str, Any],
        schema_path: Path,
        path: str,
        errors: list[str],
    ) -> None:
        if not schema:
            return

        if "$ref" in schema:
            ref_schema_path = (schema_path.parent / schema["$ref"]).resolve()
            ref_schema = json.loads(ref_schema_path.read_text(encoding="utf-8"))
            self._validate_node(value, ref_schema, ref_schema_path, path, errors)
            return

        if "allOf" in schema:
            for child in schema["allOf"]:
                self._validate_node(value, child, schema_path, path, errors)
            return

        expected_type = schema.get("type")
        if expected_type is not None and not self._matches_type(value, expected_type):
            errors.append(
                f"{path}: expected type {expected_type}, got {type(value).__name__}"
            )
            return

        if "const" in schema and value != schema["const"]:
            errors.append(f"{path}: expected constant value {schema['const']!r}")

        if "enum" in schema and value not in schema["enum"]:
            errors.append(f"{path}: expected one of {schema['enum']!r}")

        if isinstance(value, str):
            min_length = schema.get("minLength")
            if min_length is not None and len(value) < min_length:
                errors.append(f"{path}: string is shorter than {min_length}")

        if isinstance(value, list):
            min_items = schema.get("minItems")
            if min_items is not None and len(value) < min_items:
                errors.append(f"{path}: array must contain at least {min_items} item(s)")
            items_schema = schema.get("items")
            if isinstance(items_schema, dict):
                for index, item in enumerate(value):
                    self._validate_node(
                        item,
                        items_schema,
                        schema_path,
                        f"{path}[{index}]",
                        errors,
                    )

        if isinstance(value, (int, float)) and not isinstance(value, bool):
            minimum = schema.get("minimum")
            if minimum is not None and value < minimum:
                errors.append(f"{path}: value must be >= {minimum}")
            maximum = schema.get("maximum")
            if maximum is not None and value > maximum:
                errors.append(f"{path}: value must be <= {maximum}")

        if isinstance(value, dict):
            min_properties = schema.get("minProperties")
            if min_properties is not None and len(value) < min_properties:
                errors.append(f"{path}: object must contain at least {min_properties} propertie(s)")
            required = schema.get("required", [])
            for key in required:
                if key not in value:
                    errors.append(f"{path}: missing required property '{key}'")

            properties = schema.get("properties", {})
            additional_properties = schema.get("additionalProperties", True)
            for key, item in value.items():
                if key in properties:
                    self._validate_node(
                        item,
                        properties[key],
                        schema_path,
                        f"{path}.{key}",
                        errors,
                    )
                elif additional_properties is False:
                    errors.append(f"{path}: unexpected property '{key}'")
                elif isinstance(additional_properties, dict):
                    self._validate_node(
                        item,
                        additional_properties,
                        schema_path,
                        f"{path}.{key}",
                        errors,
                    )

    def _matches_type(self, value: Any, expected_type: Any) -> bool:
        if isinstance(expected_type, list):
            return any(self._matches_type(value, item) for item in expected_type)

        type_checks = {
            "object": lambda candidate: isinstance(candidate, dict),
            "array": lambda candidate: isinstance(candidate, list),
            "string": lambda candidate: isinstance(candidate, str),
            "integer": lambda candidate: isinstance(candidate, int)
            and not isinstance(candidate, bool),
            "number": lambda candidate: isinstance(candidate, (int, float))
            and not isinstance(candidate, bool),
            "boolean": lambda candidate: isinstance(candidate, bool),
            "null": lambda candidate: candidate is None,
        }
        checker = type_checks.get(expected_type)
        if checker is None:
            return True
        return checker(value)


schema_validation_service = SchemaValidationService()
