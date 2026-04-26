import json
from pathlib import Path
from typing import Any

from app.models.api import SchemaValidationStatus
from app.services.catalog import catalog_service

REPO_ROOT = Path(__file__).resolve().parents[3]
TOOL_SCHEMAS_ROOT = REPO_ROOT / "schemas" / "tools"
SUPPORTED_VALIDATION_KEYWORDS = {
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
}
NOT_CLAIMED_KEYWORDS = {
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
}
SCHEMA_METADATA_KEYWORDS = {"$schema", "$id", "title"}


class SchemaValidationService:
    def get_capability_status(self) -> SchemaValidationStatus:
        schema_profile = self._collect_active_tool_schema_profile()
        persisted_coverage = self._persisted_schema_coverage()
        family_coverage = self._persisted_family_coverage(persisted_coverage)
        active_keywords = schema_profile["active_keywords"]
        active_unsupported_keywords = schema_profile["active_unsupported_keywords"]
        active_metadata_keywords = schema_profile["active_metadata_keywords"]
        return SchemaValidationStatus(
            mode="subset-json-schema",
            schema_scope="published-tool-arg-result-schemas",
            supports_request_args=True,
            supports_result_conformance=True,
            supports_persisted_execution_details=bool(
                persisted_coverage["execution-details"]
            ),
            supports_persisted_artifact_metadata=bool(
                persisted_coverage["artifact-metadata"]
            ),
            active_keywords=active_keywords,
            active_unsupported_keywords=active_unsupported_keywords,
            active_metadata_keywords=active_metadata_keywords,
            supported_keywords=sorted(
                keyword for keyword in active_keywords if keyword in SUPPORTED_VALIDATION_KEYWORDS
            ),
            supported_refs=["relative local schema refs only"] if "$ref" in active_keywords else [],
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
            persisted_execution_details_tool_count=len(
                persisted_coverage["execution-details"]
            ),
            persisted_artifact_metadata_tool_count=len(
                persisted_coverage["artifact-metadata"]
            ),
            persisted_execution_details_tools=persisted_coverage["execution-details"],
            persisted_artifact_metadata_tools=persisted_coverage["artifact-metadata"],
            persisted_family_coverage=family_coverage,
            notes=[
                (
                    "Validation coverage is intentionally limited to the subset used by "
                    "the published tool arg/result schemas."
                ),
                (
                    "Persisted payload coverage is reported separately so execution-details "
                    "and artifact-metadata schema rollout stays explicit."
                ),
                (
                    "Active keywords are derived from the current published tool arg/result "
                    "schema files, not the broader repository schema tree."
                ),
                (
                    "Current published tool schemas are expected to stay within the "
                    "supported subset; active unsupported keywords should remain empty."
                ),
                "The validator does not claim full JSON Schema support.",
                (
                    "Simulated result conformance checks validate the current simulated "
                    "dispatch payload shape, not real O3DE adapter outputs."
                ),
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

    def validate_execution_details(
        self,
        *,
        tool_name: str,
        payload: dict[str, Any],
    ) -> list[str]:
        schema_ref = self._persisted_schema_ref(
            tool_name=tool_name,
            schema_kind="execution-details",
        )
        if schema_ref is None:
            return []
        return self.validate_tool_args(schema_ref=schema_ref, payload=payload)

    def get_persisted_schema_ref(
        self,
        *,
        tool_name: str,
        schema_kind: str,
    ) -> str | None:
        return self._persisted_schema_ref(tool_name=tool_name, schema_kind=schema_kind)

    def validate_artifact_metadata(
        self,
        *,
        tool_name: str,
        payload: dict[str, Any],
    ) -> list[str]:
        schema_ref = self._persisted_schema_ref(
            tool_name=tool_name,
            schema_kind="artifact-metadata",
        )
        if schema_ref is None:
            return []
        return self.validate_tool_args(schema_ref=schema_ref, payload=payload)

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
                errors.append(
                    f"{path}: object must contain at least {min_properties} propertie(s)"
                )
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

    def _collect_active_tool_schema_profile(self) -> dict[str, list[str]]:
        observed: set[str] = set()
        for schema_path in TOOL_SCHEMAS_ROOT.rglob("*.json"):
            data = json.loads(schema_path.read_text(encoding="utf-8"))
            self._collect_schema_keywords(data, observed)
        return {
            "active_keywords": sorted(observed & SUPPORTED_VALIDATION_KEYWORDS),
            "active_unsupported_keywords": sorted(observed & NOT_CLAIMED_KEYWORDS),
            "active_metadata_keywords": sorted(observed & SCHEMA_METADATA_KEYWORDS),
        }

    def _collect_schema_keywords(self, value: Any, observed: set[str]) -> None:
        if isinstance(value, dict):
            observed.update(value.keys())
            for item in value.values():
                self._collect_schema_keywords(item, observed)
        elif isinstance(value, list):
            for item in value:
                self._collect_schema_keywords(item, observed)

    def _persisted_schema_ref(
        self,
        *,
        tool_name: str,
        schema_kind: str,
    ) -> str | None:
        persisted_schema_refs = self._persisted_schema_refs()
        return persisted_schema_refs.get((tool_name, schema_kind))

    def _persisted_schema_refs(self) -> dict[tuple[str, str], str]:
        return {
            ("render.shader.rebuild", "execution-details"): (
                "schemas/tools/render.shader.rebuild.execution-details.schema.json"
            ),
            ("render.shader.rebuild", "artifact-metadata"): (
                "schemas/tools/render.shader.rebuild.artifact-metadata.schema.json"
            ),
            ("render.material.patch", "execution-details"): (
                "schemas/tools/render.material.patch.execution-details.schema.json"
            ),
            ("render.material.patch", "artifact-metadata"): (
                "schemas/tools/render.material.patch.artifact-metadata.schema.json"
            ),
            ("asset.move.safe", "execution-details"): (
                "schemas/tools/asset.move.safe.execution-details.schema.json"
            ),
            ("asset.move.safe", "artifact-metadata"): (
                "schemas/tools/asset.move.safe.artifact-metadata.schema.json"
            ),
            ("asset.batch.process", "execution-details"): (
                "schemas/tools/asset.batch.process.execution-details.schema.json"
            ),
            ("asset.batch.process", "artifact-metadata"): (
                "schemas/tools/asset.batch.process.artifact-metadata.schema.json"
            ),
            ("test.tiaf.sequence", "execution-details"): (
                "schemas/tools/test.tiaf.sequence.execution-details.schema.json"
            ),
            ("test.tiaf.sequence", "artifact-metadata"): (
                "schemas/tools/test.tiaf.sequence.artifact-metadata.schema.json"
            ),
            ("test.run.gtest", "execution-details"): (
                "schemas/tools/test.run.gtest.execution-details.schema.json"
            ),
            ("test.run.gtest", "artifact-metadata"): (
                "schemas/tools/test.run.gtest.artifact-metadata.schema.json"
            ),
            ("test.run.editor_python", "execution-details"): (
                "schemas/tools/test.run.editor_python.execution-details.schema.json"
            ),
            ("test.run.editor_python", "artifact-metadata"): (
                "schemas/tools/test.run.editor_python.artifact-metadata.schema.json"
            ),
            ("editor.component.add", "execution-details"): (
                "schemas/tools/editor.component.add.execution-details.schema.json"
            ),
            ("editor.component.add", "artifact-metadata"): (
                "schemas/tools/editor.component.add.artifact-metadata.schema.json"
            ),
            ("editor.component.find", "execution-details"): (
                "schemas/tools/editor.component.find.execution-details.schema.json"
            ),
            ("editor.component.find", "artifact-metadata"): (
                "schemas/tools/editor.component.find.artifact-metadata.schema.json"
            ),
            ("editor.component.property.get", "execution-details"): (
                "schemas/tools/editor.component.property.get.execution-details.schema.json"
            ),
            ("editor.component.property.get", "artifact-metadata"): (
                "schemas/tools/editor.component.property.get.artifact-metadata.schema.json"
            ),
            (
                "editor.component.property.write.camera_bool_make_active_on_activation",
                "execution-details",
            ): (
                "schemas/tools/editor.component.property.write.camera_bool_make_active_on_activation.execution-details.schema.json"
            ),
            (
                "editor.component.property.write.camera_bool_make_active_on_activation",
                "artifact-metadata",
            ): (
                "schemas/tools/editor.component.property.write.camera_bool_make_active_on_activation.artifact-metadata.schema.json"
            ),
            ("editor.entity.create", "execution-details"): (
                "schemas/tools/editor.entity.create.execution-details.schema.json"
            ),
            ("editor.entity.create", "artifact-metadata"): (
                "schemas/tools/editor.entity.create.artifact-metadata.schema.json"
            ),
            ("editor.entity.exists", "execution-details"): (
                "schemas/tools/editor.entity.exists.execution-details.schema.json"
            ),
            ("editor.entity.exists", "artifact-metadata"): (
                "schemas/tools/editor.entity.exists.artifact-metadata.schema.json"
            ),
            ("editor.level.open", "execution-details"): (
                "schemas/tools/editor.level.open.execution-details.schema.json"
            ),
            ("editor.level.open", "artifact-metadata"): (
                "schemas/tools/editor.level.open.artifact-metadata.schema.json"
            ),
            ("editor.session.open", "execution-details"): (
                "schemas/tools/editor.session.open.execution-details.schema.json"
            ),
            ("editor.session.open", "artifact-metadata"): (
                "schemas/tools/editor.session.open.artifact-metadata.schema.json"
            ),
            ("build.configure", "execution-details"): (
                "schemas/tools/build.configure.execution-details.schema.json"
            ),
            ("build.configure", "artifact-metadata"): (
                "schemas/tools/build.configure.artifact-metadata.schema.json"
            ),
            ("settings.patch", "execution-details"): (
                "schemas/tools/settings.patch.execution-details.schema.json"
            ),
            ("settings.patch", "artifact-metadata"): (
                "schemas/tools/settings.patch.artifact-metadata.schema.json"
            ),
            ("gem.enable", "execution-details"): (
                "schemas/tools/gem.enable.execution-details.schema.json"
            ),
            ("gem.enable", "artifact-metadata"): (
                "schemas/tools/gem.enable.artifact-metadata.schema.json"
            ),
            ("build.compile", "execution-details"): (
                "schemas/tools/build.compile.execution-details.schema.json"
            ),
            ("build.compile", "artifact-metadata"): (
                "schemas/tools/build.compile.artifact-metadata.schema.json"
            ),
            ("asset.processor.status", "execution-details"): (
                "schemas/tools/asset.processor.status.execution-details.schema.json"
            ),
            ("asset.processor.status", "artifact-metadata"): (
                "schemas/tools/asset.processor.status.artifact-metadata.schema.json"
            ),
            ("asset.source.inspect", "execution-details"): (
                "schemas/tools/asset.source.inspect.execution-details.schema.json"
            ),
            ("asset.source.inspect", "artifact-metadata"): (
                "schemas/tools/asset.source.inspect.artifact-metadata.schema.json"
            ),
            ("render.material.inspect", "execution-details"): (
                "schemas/tools/render.material.inspect.execution-details.schema.json"
            ),
            ("render.material.inspect", "artifact-metadata"): (
                "schemas/tools/render.material.inspect.artifact-metadata.schema.json"
            ),
            ("render.capture.viewport", "execution-details"): (
                "schemas/tools/render.capture.viewport.execution-details.schema.json"
            ),
            ("render.capture.viewport", "artifact-metadata"): (
                "schemas/tools/render.capture.viewport.artifact-metadata.schema.json"
            ),
            ("test.visual.diff", "execution-details"): (
                "schemas/tools/test.visual.diff.execution-details.schema.json"
            ),
            ("test.visual.diff", "artifact-metadata"): (
                "schemas/tools/test.visual.diff.artifact-metadata.schema.json"
            ),
            ("project.inspect", "execution-details"): (
                "schemas/tools/project.inspect.execution-details.schema.json"
            ),
            ("project.inspect", "artifact-metadata"): (
                "schemas/tools/project.inspect.artifact-metadata.schema.json"
            ),
        }

    def _persisted_schema_coverage(self) -> dict[str, list[str]]:
        coverage: dict[str, set[str]] = {
            "execution-details": set(),
            "artifact-metadata": set(),
        }
        for tool_name, schema_kind in self._persisted_schema_refs():
            coverage[schema_kind].add(tool_name)
        return {
            "execution-details": sorted(coverage["execution-details"]),
            "artifact-metadata": sorted(coverage["artifact-metadata"]),
        }

    def _persisted_family_coverage(
        self,
        persisted_coverage: dict[str, list[str]],
    ) -> list[dict[str, Any]]:
        execution_details = set(persisted_coverage["execution-details"])
        artifact_metadata = set(persisted_coverage["artifact-metadata"])
        family_rows: list[dict[str, Any]] = []

        for agent in catalog_service.get_catalog_model().agents:
            tool_names = sorted(tool.name for tool in agent.tools)
            covered_tools = sorted(
                tool_name
                for tool_name in tool_names
                if tool_name in execution_details and tool_name in artifact_metadata
            )
            uncovered_tools = sorted(
                tool_name for tool_name in tool_names if tool_name not in covered_tools
            )
            family_rows.append(
                {
                    "family": agent.id,
                    "total_tools": len(tool_names),
                    "execution_details_tools": sum(
                        1 for tool_name in tool_names if tool_name in execution_details
                    ),
                    "artifact_metadata_tools": sum(
                        1 for tool_name in tool_names if tool_name in artifact_metadata
                    ),
                    "covered_tools": covered_tools,
                    "uncovered_tools": uncovered_tools,
                }
            )

        return family_rows


schema_validation_service = SchemaValidationService()
