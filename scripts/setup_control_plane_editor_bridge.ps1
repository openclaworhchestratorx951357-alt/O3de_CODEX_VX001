param(
    [string]$ProjectRoot = "C:\Users\topgu\O3DE\Projects\McpSandbox"
)

$ErrorActionPreference = "Stop"

$gemRoot = Join-Path $ProjectRoot "Gems\ControlPlaneEditorBridge"
$codeRoot = Join-Path $gemRoot "Code"
$includeRoot = Join-Path $codeRoot "Include\ControlPlaneEditorBridge"
$sourceRoot = Join-Path $codeRoot "Source\Tools"
$editorScriptsRoot = Join-Path $gemRoot "Editor\Scripts"

New-Item -ItemType Directory -Force -Path $includeRoot | Out-Null
New-Item -ItemType Directory -Force -Path $sourceRoot | Out-Null
New-Item -ItemType Directory -Force -Path $editorScriptsRoot | Out-Null

@'
{
    "gem_name": "ControlPlaneEditorBridge",
    "version": "0.1.0",
    "display_name": "Control Plane Editor Bridge",
    "license": "Apache-2.0 OR MIT",
    "origin": "openclaworhchestratorx951357-alt/O3de_CODEX_VX001",
    "type": "Code",
    "summary": "Minimal editor-side bridge for narrow control-plane compatibility on McpSandbox.",
    "canonical_tags": [
        "Gem"
    ],
    "user_tags": [
        "Editor",
        "Automation",
        "Bridge"
    ],
    "requirements": "Editor host only.",
    "documentation_url": "",
    "dependencies": [
        "EditorPythonBindings"
    ]
}
'@ | Set-Content -Path (Join-Path $gemRoot "gem.json") -Encoding UTF8

@'
o3de_gem_setup("ControlPlaneEditorBridge")

add_subdirectory(Code)
'@ | Set-Content -Path (Join-Path $gemRoot "CMakeLists.txt") -Encoding UTF8

@'
if(NOT PAL_TRAIT_BUILD_HOST_TOOLS)
    return()
endif()

ly_add_target(
    NAME ${gem_name}.Static STATIC
    NAMESPACE Gem
    FILES_CMAKE
        controlplaneeditorbridge_common_files.cmake
    INCLUDE_DIRECTORIES
        PRIVATE
            Source
        PUBLIC
            Include
    BUILD_DEPENDENCIES
        PRIVATE
            AZ::AzCore
        PUBLIC
            AZ::AzToolsFramework
            Legacy::Editor.Headers
)

ly_add_target(
    NAME ${gem_name}.Editor GEM_MODULE
    NAMESPACE Gem
    FILES_CMAKE
        controlplaneeditorbridge_editor_files.cmake
    INCLUDE_DIRECTORIES
        PRIVATE
            Source
        PUBLIC
            Include
    BUILD_DEPENDENCIES
        PRIVATE
            Gem::${gem_name}.Static
)

ly_add_source_properties(
SOURCES
    Source/Tools/ControlPlaneEditorBridgeEditorModule.cpp
PROPERTY COMPILE_DEFINITIONS
    VALUES
        O3DE_GEM_NAME=${gem_name}
        O3DE_GEM_VERSION=${gem_version})

ly_create_alias(NAME ${gem_name}.Builders NAMESPACE Gem TARGETS ${gem_name}.Editor)
ly_create_alias(NAME ${gem_name}.Tools    NAMESPACE Gem TARGETS ${gem_name}.Editor)

o3de_add_variant_dependencies_for_gem_dependencies(GEM_NAME ${gem_name} VARIANTS Tools Builders)
'@ | Set-Content -Path (Join-Path $codeRoot "CMakeLists.txt") -Encoding UTF8

@'
set(FILES
    Include/ControlPlaneEditorBridge/ControlPlaneEditorBridgeBus.h
    Include/ControlPlaneEditorBridge/ControlPlaneEditorBridgeTypeIds.h
    Source/Tools/ControlPlaneEditorBridgeEditorSystemComponent.h
    Source/Tools/ControlPlaneEditorBridgeEditorSystemComponent.cpp
)
'@ | Set-Content -Path (Join-Path $codeRoot "controlplaneeditorbridge_common_files.cmake") -Encoding UTF8

@'
set(FILES
    Source/Tools/ControlPlaneEditorBridgeEditorModule.cpp
)
'@ | Set-Content -Path (Join-Path $codeRoot "controlplaneeditorbridge_editor_files.cmake") -Encoding UTF8

@'
#pragma once

namespace ControlPlaneEditorBridge
{
    inline constexpr const char* ControlPlaneEditorBridgeEditorSystemComponentTypeId = "{91C5B777-0C43-4CB3-B1A0-75D8DCA57E1F}";
    inline constexpr const char* ControlPlaneEditorBridgeEditorModuleTypeId = "{A74D69AB-50A1-4E4B-93E8-086A9601F34E}";
    inline constexpr const char* ControlPlaneEditorBridgeRequestsTypeId = "{6C42E9A6-5230-412F-8EFA-39442356DD9B}";
} // namespace ControlPlaneEditorBridge
'@ | Set-Content -Path (Join-Path $includeRoot "ControlPlaneEditorBridgeTypeIds.h") -Encoding UTF8

@'
#pragma once

#include <ControlPlaneEditorBridge/ControlPlaneEditorBridgeTypeIds.h>

#include <AzCore/EBus/EBus.h>
#include <AzCore/Interface/Interface.h>
#include <AzCore/std/string/string.h>

namespace ControlPlaneEditorBridge
{
    class ControlPlaneEditorBridgeRequests
    {
    public:
        AZ_RTTI(ControlPlaneEditorBridgeRequests, ControlPlaneEditorBridgeRequestsTypeId);
        virtual ~ControlPlaneEditorBridgeRequests() = default;

        virtual AZStd::string Ping() = 0;
        virtual AZStd::string GetEditorContext() = 0;
        virtual AZStd::string EnsureLevelOpen(AZStd::string_view levelPath) = 0;
        virtual AZStd::string CreateEntityProbe(AZStd::string_view levelPath, AZStd::string_view entityName) = 0;
        virtual AZStd::string CreateRootEntity(AZStd::string_view levelPath, AZStd::string_view entityName) = 0;
    };

    class ControlPlaneEditorBridgeBusTraits
        : public AZ::EBusTraits
    {
    public:
        static constexpr AZ::EBusHandlerPolicy HandlerPolicy = AZ::EBusHandlerPolicy::Single;
        static constexpr AZ::EBusAddressPolicy AddressPolicy = AZ::EBusAddressPolicy::Single;
    };

    using ControlPlaneEditorBridgeRequestBus = AZ::EBus<ControlPlaneEditorBridgeRequests, ControlPlaneEditorBridgeBusTraits>;
    using ControlPlaneEditorBridgeInterface = AZ::Interface<ControlPlaneEditorBridgeRequests>;
} // namespace ControlPlaneEditorBridge
'@ | Set-Content -Path (Join-Path $includeRoot "ControlPlaneEditorBridgeBus.h") -Encoding UTF8

@'
#pragma once

#include <AzCore/Component/Component.h>

#include <ControlPlaneEditorBridge/ControlPlaneEditorBridgeBus.h>

namespace ControlPlaneEditorBridge
{
    class ControlPlaneEditorBridgeEditorSystemComponent
        : public AZ::Component
        , protected ControlPlaneEditorBridgeRequestBus::Handler
    {
    public:
        AZ_COMPONENT_DECL(ControlPlaneEditorBridgeEditorSystemComponent);

        static void Reflect(AZ::ReflectContext* context);

        static void GetProvidedServices(AZ::ComponentDescriptor::DependencyArrayType& provided);
        static void GetIncompatibleServices(AZ::ComponentDescriptor::DependencyArrayType& incompatible);
        static void GetRequiredServices(AZ::ComponentDescriptor::DependencyArrayType& required);
        static void GetDependentServices(AZ::ComponentDescriptor::DependencyArrayType& dependent);

        ControlPlaneEditorBridgeEditorSystemComponent();
        ~ControlPlaneEditorBridgeEditorSystemComponent() override;

        AZStd::string Ping() override;
        AZStd::string GetEditorContext() override;
        AZStd::string EnsureLevelOpen(AZStd::string_view levelPath) override;
        AZStd::string CreateEntityProbe(AZStd::string_view levelPath, AZStd::string_view entityName) override;
        AZStd::string CreateRootEntity(AZStd::string_view levelPath, AZStd::string_view entityName) override;

        void Init() override;
        void Activate() override;
        void Deactivate() override;
    };
} // namespace ControlPlaneEditorBridge
'@ | Set-Content -Path (Join-Path $sourceRoot "ControlPlaneEditorBridgeEditorSystemComponent.h") -Encoding UTF8

@'
#include <AzCore/IO/Path/Path.h>
#include <AzCore/IO/SystemFile.h>
#include <AzCore/RTTI/BehaviorContext.h>
#include <AzCore/Serialization/SerializeContext.h>
#include <AzCore/Utils/Utils.h>
#include <AzToolsFramework/API/ToolsApplicationAPI.h>
#include <AzToolsFramework/Entity/EditorEntityContextBus.h>

#include <rapidjson/document.h>
#include <rapidjson/stringbuffer.h>
#include <rapidjson/writer.h>

#include <EditorToolsApplicationAPI.h>

#include "ControlPlaneEditorBridgeEditorSystemComponent.h"

#include <ControlPlaneEditorBridge/ControlPlaneEditorBridgeTypeIds.h>

namespace ControlPlaneEditorBridge
{
    namespace
    {
        constexpr const char* BridgeName = "ControlPlaneEditorBridge";
        constexpr const char* BridgeVersion = "0.1.0";
        constexpr const char* BridgeContractVersion = "v0.1";
        constexpr const char* DefaultLevelTemplate = "DefaultLevel";

        void AddStringMember(
            rapidjson::Value& object,
            rapidjson::Document::AllocatorType& allocator,
            const char* key,
            AZStd::string_view value)
        {
            rapidjson::Value jsonKey;
            jsonKey.SetString(key, allocator);
            rapidjson::Value jsonValue;
            jsonValue.SetString(value.data(), static_cast<rapidjson::SizeType>(value.size()), allocator);
            object.AddMember(jsonKey, jsonValue, allocator);
        }

        void AddBoolMember(
            rapidjson::Value& object,
            rapidjson::Document::AllocatorType& allocator,
            const char* key,
            bool value)
        {
            rapidjson::Value jsonKey;
            jsonKey.SetString(key, allocator);
            object.AddMember(jsonKey, value, allocator);
        }

        void AddIntMember(
            rapidjson::Value& object,
            rapidjson::Document::AllocatorType& allocator,
            const char* key,
            int value)
        {
            rapidjson::Value jsonKey;
            jsonKey.SetString(key, allocator);
            object.AddMember(jsonKey, value, allocator);
        }

        AZStd::string NormalizePathForCompare(AZStd::string value)
        {
            for (char& character : value)
            {
                if (character == '\\')
                {
                    character = '/';
                }
                else if (character >= 'A' && character <= 'Z')
                {
                    character = static_cast<char>(character - 'A' + 'a');
                }
            }
            return value;
        }

        AZStd::string CurrentLevelName()
        {
            AZStd::string levelName;
            EditorInternal::EditorToolsApplicationRequestBus::BroadcastResult(
                levelName,
                &EditorInternal::EditorToolsApplicationRequests::GetCurrentLevelName);
            return levelName;
        }

        AZStd::string CurrentLevelPath()
        {
            AZStd::string levelPath;
            EditorInternal::EditorToolsApplicationRequestBus::BroadcastResult(
                levelPath,
                &EditorInternal::EditorToolsApplicationRequests::GetCurrentLevelPath);
            return levelPath;
        }

        int SelectedEntityCount()
        {
            int selectedCount = 0;
            AzToolsFramework::ToolsApplicationRequestBus::BroadcastResult(
                selectedCount,
                &AzToolsFramework::ToolsApplicationRequests::GetSelectedEntitiesCount);
            return selectedCount;
        }

        bool EditorContextWritable()
        {
            bool editorRunningGame = false;
            AzToolsFramework::EditorEntityContextRequestBus::BroadcastResult(
                editorRunningGame,
                &AzToolsFramework::EditorEntityContextRequests::IsEditorRunningGame);
            return !editorRunningGame;
        }

        AZStd::string ResolvedLevelPath(AZStd::string_view levelPath)
        {
            AZ::IO::PathView requestedLevel(levelPath);
            if (requestedLevel.IsAbsolute())
            {
                return AZStd::string(levelPath);
            }

            AZ::IO::FixedMaxPath resolvedPath = AZ::Utils::GetProjectPath();
            resolvedPath /= requestedLevel;
            return AZStd::string(resolvedPath.c_str());
        }

        AZStd::string LevelLeafName(AZStd::string_view levelPath)
        {
            AZStd::string leaf(levelPath);
            const size_t slashIndex = leaf.find_last_of("\\/");
            if (slashIndex != AZStd::string::npos)
            {
                leaf = leaf.substr(slashIndex + 1);
            }

            const size_t extensionIndex = leaf.find_last_of('.');
            if (extensionIndex != AZStd::string::npos)
            {
                leaf = leaf.substr(0, extensionIndex);
            }
            return leaf;
        }

        bool LevelMatchesRequest(AZStd::string_view currentLevelPath, AZStd::string_view requestedLevelPath)
        {
            const AZStd::string normalizedCurrent = NormalizePathForCompare(AZStd::string(currentLevelPath));
            const AZStd::string normalizedRequested = NormalizePathForCompare(ResolvedLevelPath(requestedLevelPath));
            const AZStd::string normalizedRequestedRaw = NormalizePathForCompare(AZStd::string(requestedLevelPath));
            return normalizedCurrent == normalizedRequested || normalizedCurrent == normalizedRequestedRaw;
        }

        AZStd::string EntityIdToText(const AZ::EntityId& entityId)
        {
            return entityId.IsValid() ? entityId.ToString() : AZStd::string();
        }

        bool ClearSelection()
        {
            AzToolsFramework::EntityIdList clearedSelection;
            AzToolsFramework::ToolsApplicationRequestBus::Broadcast(
                &AzToolsFramework::ToolsApplicationRequests::SetSelectedEntities,
                clearedSelection);
            return SelectedEntityCount() == 0;
        }

        template<class DetailBuilder>
        AZStd::string BuildResponse(
            bool success,
            AZStd::string_view operation,
            AZStd::string_view resultSummary,
            AZStd::string_view errorCode,
            DetailBuilder&& detailBuilder)
        {
            rapidjson::Document document;
            document.SetObject();
            auto& allocator = document.GetAllocator();

            AddBoolMember(document, allocator, "success", success);
            AddStringMember(document, allocator, "operation", operation);
            AddStringMember(document, allocator, "bridge_name", BridgeName);
            AddStringMember(document, allocator, "bridge_version", BridgeVersion);
            AddStringMember(document, allocator, "bridge_contract_version", BridgeContractVersion);
            AddStringMember(document, allocator, "result_summary", resultSummary);
            if (!errorCode.empty())
            {
                AddStringMember(document, allocator, "error_code", errorCode);
            }

            rapidjson::Value details(rapidjson::kObjectType);
            detailBuilder(details, allocator);
            document.AddMember("details", details, allocator);

            rapidjson::StringBuffer buffer;
            rapidjson::Writer<rapidjson::StringBuffer> writer(buffer);
            document.Accept(writer);
            return buffer.GetString();
        }
    } // namespace

    AZ_COMPONENT_IMPL(
        ControlPlaneEditorBridgeEditorSystemComponent,
        "ControlPlaneEditorBridgeEditorSystemComponent",
        ControlPlaneEditorBridgeEditorSystemComponentTypeId);

    void ControlPlaneEditorBridgeEditorSystemComponent::Reflect(AZ::ReflectContext* context)
    {
        if (auto serializeContext = azrtti_cast<AZ::SerializeContext*>(context))
        {
            serializeContext->Class<ControlPlaneEditorBridgeEditorSystemComponent, AZ::Component>()
                ->Version(0);
        }

        if (auto behaviorContext = azrtti_cast<AZ::BehaviorContext*>(context))
        {
            behaviorContext->EBus<ControlPlaneEditorBridgeRequestBus>("ControlPlaneEditorBridgeRequestBus")
                ->Attribute(AZ::Script::Attributes::Scope, AZ::Script::Attributes::ScopeFlags::Automation)
                ->Attribute(AZ::Script::Attributes::Category, "Editor")
                ->Attribute(AZ::Script::Attributes::Module, "control_plane_editor_bridge")
                ->Event("Ping", &ControlPlaneEditorBridgeRequests::Ping)
                ->Event("GetEditorContext", &ControlPlaneEditorBridgeRequests::GetEditorContext)
                ->Event("EnsureLevelOpen", &ControlPlaneEditorBridgeRequests::EnsureLevelOpen)
                ->Event("CreateEntityProbe", &ControlPlaneEditorBridgeRequests::CreateEntityProbe)
                ->Event("CreateRootEntity", &ControlPlaneEditorBridgeRequests::CreateRootEntity);
        }
    }

    void ControlPlaneEditorBridgeEditorSystemComponent::GetProvidedServices(AZ::ComponentDescriptor::DependencyArrayType& provided)
    {
        provided.push_back(AZ_CRC_CE("ControlPlaneEditorBridgeEditorService"));
    }

    void ControlPlaneEditorBridgeEditorSystemComponent::GetIncompatibleServices(AZ::ComponentDescriptor::DependencyArrayType& incompatible)
    {
        incompatible.push_back(AZ_CRC_CE("ControlPlaneEditorBridgeEditorService"));
    }

    void ControlPlaneEditorBridgeEditorSystemComponent::GetRequiredServices(AZ::ComponentDescriptor::DependencyArrayType& required)
    {
        required.push_back(AZ_CRC_CE("EditorEntityContextService"));
    }

    void ControlPlaneEditorBridgeEditorSystemComponent::GetDependentServices([[maybe_unused]] AZ::ComponentDescriptor::DependencyArrayType& dependent)
    {
    }

    ControlPlaneEditorBridgeEditorSystemComponent::ControlPlaneEditorBridgeEditorSystemComponent()
    {
        if (ControlPlaneEditorBridgeInterface::Get() == nullptr)
        {
            ControlPlaneEditorBridgeInterface::Register(this);
        }
    }

    ControlPlaneEditorBridgeEditorSystemComponent::~ControlPlaneEditorBridgeEditorSystemComponent()
    {
        if (ControlPlaneEditorBridgeInterface::Get() == this)
        {
            ControlPlaneEditorBridgeInterface::Unregister(this);
        }
    }

    void ControlPlaneEditorBridgeEditorSystemComponent::Init()
    {
    }

    void ControlPlaneEditorBridgeEditorSystemComponent::Activate()
    {
        ControlPlaneEditorBridgeRequestBus::Handler::BusConnect();
    }

    void ControlPlaneEditorBridgeEditorSystemComponent::Deactivate()
    {
        ControlPlaneEditorBridgeRequestBus::Handler::BusDisconnect();
    }

    AZStd::string ControlPlaneEditorBridgeEditorSystemComponent::Ping()
    {
        const AZStd::string currentLevelPath = CurrentLevelPath();
        const AZStd::string currentLevelName = CurrentLevelName();
        const AZStd::string projectName = AZStd::string(AZ::Utils::GetProjectName().c_str());

        return BuildResponse(
            true,
            "Ping",
            "Bridge is loaded and callable in the editor context.",
            "",
            [&](rapidjson::Value& details, rapidjson::Document::AllocatorType& allocator)
            {
                AddStringMember(details, allocator, "project_name", projectName);
                AddStringMember(details, allocator, "project_path", AZStd::string(AZ::Utils::GetProjectPath().c_str()));
                AddStringMember(details, allocator, "active_level_name", currentLevelName);
                AddStringMember(details, allocator, "active_level_path", currentLevelPath);
                AddBoolMember(details, allocator, "level_loaded", !currentLevelPath.empty());
                AddIntMember(details, allocator, "selected_entity_count", SelectedEntityCount());
                AddBoolMember(details, allocator, "editor_context_writable", EditorContextWritable());
                AddBoolMember(details, allocator, "bridge_module_loaded", true);
            });
    }

    AZStd::string ControlPlaneEditorBridgeEditorSystemComponent::GetEditorContext()
    {
        const AZStd::string currentLevelPath = CurrentLevelPath();
        const AZStd::string currentLevelName = CurrentLevelName();

        return BuildResponse(
            true,
            "GetEditorContext",
            "Editor context snapshot captured.",
            "",
            [&](rapidjson::Value& details, rapidjson::Document::AllocatorType& allocator)
            {
                AddStringMember(details, allocator, "active_level_name", currentLevelName);
                AddStringMember(details, allocator, "active_level_path", currentLevelPath);
                AddBoolMember(details, allocator, "level_loaded", !currentLevelPath.empty());
                AddIntMember(details, allocator, "selected_entity_count", SelectedEntityCount());
                AddBoolMember(details, allocator, "editor_context_writable", EditorContextWritable());
                AddBoolMember(details, allocator, "bridge_module_loaded", true);
            });
    }

    AZStd::string ControlPlaneEditorBridgeEditorSystemComponent::EnsureLevelOpen(AZStd::string_view levelPath)
    {
        if (levelPath.empty())
        {
            return BuildResponse(
                false,
                "EnsureLevelOpen",
                "level_path is required.",
                "LEVEL_PATH_MISSING",
                [&](rapidjson::Value& details, rapidjson::Document::AllocatorType& allocator)
                {
                    AddBoolMember(details, allocator, "bridge_module_loaded", true);
                });
        }

        const AZStd::string requestedLevelPath(levelPath);
        const AZStd::string currentLevelPath = CurrentLevelPath();
        if (!currentLevelPath.empty() && LevelMatchesRequest(currentLevelPath, requestedLevelPath))
        {
            return BuildResponse(
                true,
                "EnsureLevelOpen",
                "Requested level was already open.",
                "",
                [&](rapidjson::Value& details, rapidjson::Document::AllocatorType& allocator)
                {
                    AddStringMember(details, allocator, "ensure_result", "already_open");
                    AddStringMember(details, allocator, "level_name", CurrentLevelName());
                    AddStringMember(details, allocator, "level_path", currentLevelPath);
                    AddStringMember(details, allocator, "requested_level_path", requestedLevelPath);
                    AddBoolMember(details, allocator, "level_loaded", true);
                    AddIntMember(details, allocator, "selected_entity_count", SelectedEntityCount());
                    AddBoolMember(details, allocator, "bridge_module_loaded", true);
                });
        }

        const AZStd::string resolvedLevelPath = ResolvedLevelPath(requestedLevelPath);
        const bool levelFileExists = AZ::IO::SystemFile::Exists(resolvedLevelPath.c_str());
        bool openSucceeded = false;
        int createResultCode = -1;
        AZStd::string ensureResult = "opened_existing";

        if (levelFileExists)
        {
            EditorInternal::EditorToolsApplicationRequestBus::BroadcastResult(
                openSucceeded,
                &EditorInternal::EditorToolsApplicationRequests::OpenLevelNoPrompt,
                requestedLevelPath);
            if (!openSucceeded)
            {
                return BuildResponse(
                    false,
                    "EnsureLevelOpen",
                    "The requested level could not be opened through the bridge.",
                    "LEVEL_OPEN_FAILED",
                    [&](rapidjson::Value& details, rapidjson::Document::AllocatorType& allocator)
                    {
                        AddStringMember(details, allocator, "requested_level_path", requestedLevelPath);
                        AddStringMember(details, allocator, "resolved_level_path", resolvedLevelPath);
                        AddBoolMember(details, allocator, "level_file_exists", true);
                        AddBoolMember(details, allocator, "bridge_module_loaded", true);
                    });
            }
        }
        else
        {
            ensureResult = "created";
            const AZStd::string levelName = LevelLeafName(requestedLevelPath);
            EditorInternal::EditorToolsApplicationRequestBus::BroadcastResult(
                createResultCode,
                &EditorInternal::EditorToolsApplicationRequests::CreateLevelNoPrompt,
                DefaultLevelTemplate,
                levelName,
                1024,
                false);
            if (createResultCode != 0)
            {
                return BuildResponse(
                    false,
                    "EnsureLevelOpen",
                    "The requested level could not be created through the bridge.",
                    "LEVEL_CREATE_FAILED",
                    [&](rapidjson::Value& details, rapidjson::Document::AllocatorType& allocator)
                    {
                        AddStringMember(details, allocator, "requested_level_path", requestedLevelPath);
                        AddStringMember(details, allocator, "resolved_level_path", resolvedLevelPath);
                        AddStringMember(details, allocator, "level_name", levelName);
                        AddIntMember(details, allocator, "create_result_code", createResultCode);
                        AddBoolMember(details, allocator, "bridge_module_loaded", true);
                    });
            }
        }

        const AZStd::string finalLevelPath = CurrentLevelPath();
        if (finalLevelPath.empty())
        {
            return BuildResponse(
                false,
                "EnsureLevelOpen",
                "The editor did not report a loaded level after the bridge operation.",
                "LEVEL_CONTEXT_MISSING",
                [&](rapidjson::Value& details, rapidjson::Document::AllocatorType& allocator)
                {
                    AddStringMember(details, allocator, "requested_level_path", requestedLevelPath);
                    AddStringMember(details, allocator, "resolved_level_path", resolvedLevelPath);
                    AddStringMember(details, allocator, "ensure_result", ensureResult);
                    AddIntMember(details, allocator, "create_result_code", createResultCode);
                    AddBoolMember(details, allocator, "bridge_module_loaded", true);
                });
        }

        return BuildResponse(
            true,
            "EnsureLevelOpen",
            "Level context is ready through the bridge.",
            "",
            [&](rapidjson::Value& details, rapidjson::Document::AllocatorType& allocator)
            {
                AddStringMember(details, allocator, "ensure_result", ensureResult);
                AddStringMember(details, allocator, "level_name", CurrentLevelName());
                AddStringMember(details, allocator, "level_path", finalLevelPath);
                AddStringMember(details, allocator, "requested_level_path", requestedLevelPath);
                AddStringMember(details, allocator, "resolved_level_path", resolvedLevelPath);
                AddBoolMember(details, allocator, "level_loaded", true);
                AddIntMember(details, allocator, "create_result_code", createResultCode);
                AddIntMember(details, allocator, "selected_entity_count", SelectedEntityCount());
                AddBoolMember(details, allocator, "bridge_module_loaded", true);
            });
    }

    AZStd::string ControlPlaneEditorBridgeEditorSystemComponent::CreateEntityProbe(
        AZStd::string_view levelPath,
        AZStd::string_view entityName)
    {
        const AZStd::string activeLevelPath = CurrentLevelPath();
        if (activeLevelPath.empty())
        {
            return BuildResponse(
                false,
                "CreateEntityProbe",
                "A level must be loaded before entity creation can be probed.",
                "LEVEL_NOT_LOADED",
                [&](rapidjson::Value& details, rapidjson::Document::AllocatorType& allocator)
                {
                    AddStringMember(details, allocator, "requested_level_path", AZStd::string(levelPath));
                    AddBoolMember(details, allocator, "bridge_module_loaded", true);
                });
        }

        if (!levelPath.empty() && !LevelMatchesRequest(activeLevelPath, levelPath))
        {
            return BuildResponse(
                false,
                "CreateEntityProbe",
                "The requested level does not match the currently loaded level.",
                "LEVEL_PATH_MISMATCH",
                [&](rapidjson::Value& details, rapidjson::Document::AllocatorType& allocator)
                {
                    AddStringMember(details, allocator, "requested_level_path", AZStd::string(levelPath));
                    AddStringMember(details, allocator, "active_level_path", activeLevelPath);
                    AddBoolMember(details, allocator, "bridge_module_loaded", true);
                });
        }

        const int selectedEntityCountBeforeCreate = SelectedEntityCount();
        const bool selectionCleared = ClearSelection();
        const AZStd::string probeEntityName = entityName.empty() ? AZStd::string("ControlPlaneEditorBridgeProbe") : AZStd::string(entityName);
        const AZStd::string attemptedCreateContract = "EditorEntityContextRequestBus::CreateNewEditorEntity";
        const AZStd::string prefabContextNotes =
            selectionCleared
                ? AZStd::string("Selection was cleared before create to avoid selected-entity or prefab ownership ambiguity.")
                : AZStd::string("Selection could not be cleared before create; probe stopped before mutating the editor context.");

        if (!selectionCleared)
        {
            return BuildResponse(
                false,
                "CreateEntityProbe",
                "Selection context blocked the bridge entity-create probe.",
                "ENTITY_CREATE_SELECTION_CONTEXT_BLOCKED",
                [&](rapidjson::Value& details, rapidjson::Document::AllocatorType& allocator)
                {
                    AddStringMember(details, allocator, "attempted_create_contract_name", attemptedCreateContract);
                    AddStringMember(details, allocator, "level_path", activeLevelPath);
                    AddIntMember(details, allocator, "selected_entity_count", selectedEntityCountBeforeCreate);
                    AddStringMember(details, allocator, "prefab_context_notes", prefabContextNotes);
                    AddBoolMember(details, allocator, "bridge_module_loaded", true);
                });
        }

        AZ::EntityId createdEntityId;
        AzToolsFramework::EditorEntityContextRequestBus::BroadcastResult(
            createdEntityId,
            &AzToolsFramework::EditorEntityContextRequests::CreateNewEditorEntity,
            probeEntityName.c_str());

        bool entityIsValid = false;
        if (createdEntityId.IsValid())
        {
            AzToolsFramework::EditorEntityContextRequestBus::BroadcastResult(
                entityIsValid,
                &AzToolsFramework::EditorEntityContextRequests::IsEditorEntity,
                createdEntityId);
        }

        const AZStd::string createdEntityIdText = EntityIdToText(createdEntityId);
        bool cleanupAttempted = false;
        bool cleanupSucceeded = false;
        if (entityIsValid)
        {
            cleanupAttempted = true;
            AzToolsFramework::EditorEntityContextRequestBus::BroadcastResult(
                cleanupSucceeded,
                &AzToolsFramework::EditorEntityContextRequests::DestroyEditorEntity,
                createdEntityId);
        }

        if (!entityIsValid)
        {
            return BuildResponse(
                false,
                "CreateEntityProbe",
                "Bridge entity-create probe did not return a valid editor entity id.",
                "ENTITY_CREATE_FAILED",
                [&](rapidjson::Value& details, rapidjson::Document::AllocatorType& allocator)
                {
                    AddStringMember(details, allocator, "attempted_create_contract_name", attemptedCreateContract);
                    AddStringMember(details, allocator, "entity_id", createdEntityIdText);
                    AddStringMember(details, allocator, "level_path", activeLevelPath);
                    AddIntMember(details, allocator, "selected_entity_count", selectedEntityCountBeforeCreate);
                    AddStringMember(details, allocator, "prefab_context_notes", prefabContextNotes);
                    AddBoolMember(details, allocator, "bridge_module_loaded", true);
                });
        }

        return BuildResponse(
            true,
            "CreateEntityProbe",
            "Bridge entity-create probe reached a valid editor entity id.",
            "",
            [&](rapidjson::Value& details, rapidjson::Document::AllocatorType& allocator)
            {
                AddStringMember(details, allocator, "attempted_create_contract_name", attemptedCreateContract);
                AddStringMember(details, allocator, "entity_id", createdEntityIdText);
                AddStringMember(details, allocator, "level_path", activeLevelPath);
                AddIntMember(details, allocator, "selected_entity_count", selectedEntityCountBeforeCreate);
                AddStringMember(details, allocator, "prefab_context_notes", prefabContextNotes);
                AddBoolMember(details, allocator, "probe_cleanup_attempted", cleanupAttempted);
                AddBoolMember(details, allocator, "probe_cleanup_succeeded", cleanupSucceeded);
                AddBoolMember(details, allocator, "bridge_module_loaded", true);
            });
    }

    AZStd::string ControlPlaneEditorBridgeEditorSystemComponent::CreateRootEntity(
        AZStd::string_view levelPath,
        AZStd::string_view entityName)
    {
        if (entityName.empty())
        {
            return BuildResponse(
                false,
                "CreateRootEntity",
                "entity_name is required.",
                "ENTITY_NAME_MISSING",
                [&](rapidjson::Value& details, rapidjson::Document::AllocatorType& allocator)
                {
                    AddBoolMember(details, allocator, "bridge_module_loaded", true);
                });
        }

        const AZStd::string activeLevelPath = CurrentLevelPath();
        if (activeLevelPath.empty())
        {
            return BuildResponse(
                false,
                "CreateRootEntity",
                "A level must be loaded before entity creation can run through the bridge.",
                "LEVEL_NOT_LOADED",
                [&](rapidjson::Value& details, rapidjson::Document::AllocatorType& allocator)
                {
                    AddStringMember(details, allocator, "requested_level_path", AZStd::string(levelPath));
                    AddBoolMember(details, allocator, "bridge_module_loaded", true);
                });
        }

        if (!levelPath.empty() && !LevelMatchesRequest(activeLevelPath, levelPath))
        {
            return BuildResponse(
                false,
                "CreateRootEntity",
                "The requested level does not match the currently loaded level.",
                "LEVEL_PATH_MISMATCH",
                [&](rapidjson::Value& details, rapidjson::Document::AllocatorType& allocator)
                {
                    AddStringMember(details, allocator, "requested_level_path", AZStd::string(levelPath));
                    AddStringMember(details, allocator, "active_level_path", activeLevelPath);
                    AddBoolMember(details, allocator, "bridge_module_loaded", true);
                });
        }

        const int selectedEntityCountBeforeCreate = SelectedEntityCount();
        const bool selectionCleared = ClearSelection();
        const AZStd::string attemptedCreateContract = "EditorEntityContextRequestBus::CreateNewEditorEntity";
        const AZStd::string prefabContextNotes =
            selectionCleared
                ? AZStd::string("Selection was cleared before create to avoid selected-entity or prefab ownership ambiguity.")
                : AZStd::string("Selection could not be cleared before create; bridge create stopped before mutating the editor context.");

        if (!selectionCleared)
        {
            return BuildResponse(
                false,
                "CreateRootEntity",
                "Selection context blocked bridge-backed entity creation.",
                "ENTITY_CREATE_SELECTION_CONTEXT_BLOCKED",
                [&](rapidjson::Value& details, rapidjson::Document::AllocatorType& allocator)
                {
                    AddStringMember(details, allocator, "attempted_create_contract_name", attemptedCreateContract);
                    AddStringMember(details, allocator, "level_path", activeLevelPath);
                    AddStringMember(details, allocator, "entity_name", AZStd::string(entityName));
                    AddIntMember(details, allocator, "selected_entity_count", selectedEntityCountBeforeCreate);
                    AddStringMember(details, allocator, "prefab_context_notes", prefabContextNotes);
                    AddBoolMember(details, allocator, "bridge_module_loaded", true);
                });
        }

        AZ::EntityId createdEntityId;
        const AZStd::string requestedEntityName(entityName);
        AzToolsFramework::EditorEntityContextRequestBus::BroadcastResult(
            createdEntityId,
            &AzToolsFramework::EditorEntityContextRequests::CreateNewEditorEntity,
            requestedEntityName.c_str());

        bool entityIsValid = false;
        if (createdEntityId.IsValid())
        {
            AzToolsFramework::EditorEntityContextRequestBus::BroadcastResult(
                entityIsValid,
                &AzToolsFramework::EditorEntityContextRequests::IsEditorEntity,
                createdEntityId);
        }

        const AZStd::string createdEntityIdText = EntityIdToText(createdEntityId);
        if (!entityIsValid)
        {
            return BuildResponse(
                false,
                "CreateRootEntity",
                "Bridge-backed entity creation did not return a valid editor entity id.",
                "ENTITY_CREATE_FAILED",
                [&](rapidjson::Value& details, rapidjson::Document::AllocatorType& allocator)
                {
                    AddStringMember(details, allocator, "attempted_create_contract_name", attemptedCreateContract);
                    AddStringMember(details, allocator, "entity_id", createdEntityIdText);
                    AddStringMember(details, allocator, "entity_name", requestedEntityName);
                    AddStringMember(details, allocator, "level_path", activeLevelPath);
                    AddIntMember(details, allocator, "selected_entity_count", selectedEntityCountBeforeCreate);
                    AddStringMember(details, allocator, "prefab_context_notes", prefabContextNotes);
                    AddBoolMember(details, allocator, "name_mutation_ran", false);
                    AddBoolMember(details, allocator, "name_mutation_succeeded", false);
                    AddBoolMember(details, allocator, "bridge_module_loaded", true);
                });
        }

        return BuildResponse(
            true,
            "CreateRootEntity",
            "Bridge-backed root entity creation returned a valid editor entity id.",
            "",
            [&](rapidjson::Value& details, rapidjson::Document::AllocatorType& allocator)
            {
                AddStringMember(details, allocator, "attempted_create_contract_name", attemptedCreateContract);
                AddStringMember(details, allocator, "entity_id", createdEntityIdText);
                AddStringMember(details, allocator, "entity_name", requestedEntityName);
                AddStringMember(details, allocator, "entity_id_source", "editor_entity_context_create");
                AddStringMember(details, allocator, "direct_return_entity_id", createdEntityIdText);
                AddStringMember(details, allocator, "level_path", activeLevelPath);
                AddIntMember(details, allocator, "selected_entity_count", selectedEntityCountBeforeCreate);
                AddStringMember(details, allocator, "prefab_context_notes", prefabContextNotes);
                AddBoolMember(details, allocator, "name_mutation_ran", false);
                AddBoolMember(details, allocator, "name_mutation_succeeded", true);
                AddBoolMember(details, allocator, "bridge_module_loaded", true);
            });
    }
} // namespace ControlPlaneEditorBridge
'@ | Set-Content -Path (Join-Path $sourceRoot "ControlPlaneEditorBridgeEditorSystemComponent.cpp") -Encoding UTF8

@'
#include <AzCore/Memory/SystemAllocator.h>
#include <AzCore/Module/Module.h>

#include <ControlPlaneEditorBridge/ControlPlaneEditorBridgeTypeIds.h>

#include "ControlPlaneEditorBridgeEditorSystemComponent.h"

namespace ControlPlaneEditorBridge
{
    class ControlPlaneEditorBridgeEditorModule
        : public AZ::Module
    {
    public:
        AZ_RTTI(ControlPlaneEditorBridgeEditorModule, ControlPlaneEditorBridgeEditorModuleTypeId, AZ::Module);
        AZ_CLASS_ALLOCATOR(ControlPlaneEditorBridgeEditorModule, AZ::SystemAllocator);

        ControlPlaneEditorBridgeEditorModule()
            : AZ::Module()
        {
            m_descriptors.insert(
                m_descriptors.end(),
                {
                    ControlPlaneEditorBridgeEditorSystemComponent::CreateDescriptor(),
                });
        }

        AZ::ComponentTypeList GetRequiredSystemComponents() const override
        {
            return AZ::ComponentTypeList{
                azrtti_typeid<ControlPlaneEditorBridgeEditorSystemComponent>(),
            };
        }
    };
} // namespace ControlPlaneEditorBridge

#if defined(O3DE_GEM_NAME)
AZ_DECLARE_MODULE_CLASS(AZ_JOIN(Gem_, O3DE_GEM_NAME, _Editor), ControlPlaneEditorBridge::ControlPlaneEditorBridgeEditorModule)
#else
AZ_DECLARE_MODULE_CLASS(Gem_ControlPlaneEditorBridge_Editor, ControlPlaneEditorBridge::ControlPlaneEditorBridgeEditorModule)
#endif
'@ | Set-Content -Path (Join-Path $sourceRoot "ControlPlaneEditorBridgeEditorModule.cpp") -Encoding UTF8

@'
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any
from datetime import datetime, timezone

try:
    import azlmbr.bus as bus  # type: ignore
    import azlmbr.control_plane_editor_bridge as control_plane_editor_bridge  # type: ignore
    import azlmbr.editor as editor  # type: ignore
    import azlmbr.entity as entity  # type: ignore
    import azlmbr.legacy.general as general  # type: ignore
    from azlmbr.entity import EntityId  # type: ignore
except Exception:
    bus = None
    control_plane_editor_bridge = None
    editor = None
    entity = None
    general = None
    EntityId = None

BRIDGE_NAME = "ControlPlaneEditorBridge"
BRIDGE_VERSION = "0.1.0"
PROTOCOL_VERSION = "v1"
DEFAULT_LEVEL_TEMPLATE = "DefaultLevel"
COMPONENT_ADD_ALLOWLIST = ("Camera", "Comment", "Mesh")
COMPONENT_ADD_ALLOWLIST_LOOKUP = {
    component_name.casefold(): component_name
    for component_name in COMPONENT_ADD_ALLOWLIST
}
COMMENT_SCALAR_SOURCE_GUIDED_PATHS = (
    "Comment",
    "Comment text",
    "Comment Text",
    "Comment text box",
    "Comment Text Box",
    "Comment|Comment text box",
    "Comment|Comment Text Box",
    "Configuration",
    "Configuration|Comment",
    "Configuration|Comment text",
    "Configuration|Comment text box",
)
COMMENT_PREFERRED_PATH_MARKERS = ("comment", "text", "description", "note")
COMMENT_REJECT_PATH_MARKERS = (
    "asset",
    "material",
    "mesh",
    "render",
    "ray",
    "lod",
    "lighting",
    "stat",
    "transform",
)
COMMENT_SCALAR_VALUE_TYPE_MARKERS = (
    "string",
    "azstd::string",
    "str",
    "bool",
    "boolean",
    "int",
    "float",
    "double",
    "number",
    "u32",
    "s32",
)
SCALAR_TARGET_REJECT_PATH_MARKERS = (
    "asset",
    "material",
    "mesh",
    "model",
    "render",
    "ray",
    "lod",
    "lighting",
    "shader",
    "texture",
    "pipeline",
    "transform",
)
SCALAR_TARGET_REJECT_TYPE_MARKERS = (
    "asset",
    "material",
    "mesh",
    "model",
    "vector",
    "quaternion",
    "color",
    "transform",
    "container",
)
SCALAR_TARGET_VALUE_TYPE_MARKERS = (
    "string",
    "azstd::string",
    "str",
    "bool",
    "boolean",
    "int",
    "float",
    "double",
    "number",
    "u32",
    "s32",
)
COMPONENT_ID_PATTERN = re.compile(
    r"^EntityComponentIdPair\s*\(\s*"
    r"(?:EntityId\s*\(\s*(?P<entity_wrapped>\d+)\s*\)|"
    r"\[\s*(?P<entity_bracket>\d+)\s*\]|"
    r"(?P<entity_plain>\d+))"
    r"\s*,\s*(?P<component>\d+)\s*\)$"
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _editor_available() -> bool:
    return not (
        bus is None
        or editor is None
        or entity is None
        or general is None
        or EntityId is None
    )


def _project_root_from_state(runtime_state: dict[str, Any]) -> str:
    return str(runtime_state.get("project_root") or "")


def _current_level_path() -> str | None:
    if not _editor_available():
        return None
    try:
        level_path = general.get_current_level_path()
    except Exception:
        return None
    return str(level_path) if level_path else None


def _current_level_name() -> str | None:
    if not _editor_available():
        return None
    try:
        level_name = general.get_current_level_name()
    except Exception:
        return None
    return str(level_name) if level_name else None


def _selection_count() -> int:
    if not _editor_available():
        return 0
    try:
        selected = editor.ToolsApplicationRequestBus(bus.Broadcast, "GetSelectedEntities")
    except Exception:
        return 0
    return len(selected) if isinstance(selected, list) else 0


def _editor_context_writable() -> bool:
    return _editor_available()


def _bridge_request_available() -> bool:
    return _editor_available() and control_plane_editor_bridge is not None


def _base_details(runtime_state: dict[str, Any]) -> dict[str, Any]:
    return {
        "project_root": _project_root_from_state(runtime_state),
        "bridge_module_loaded": True,
        "active_level_name": _current_level_name(),
        "active_level_path": _current_level_path(),
        "level_loaded": bool(_current_level_path()),
        "selected_entity_count": _selection_count(),
        "editor_context_writable": _editor_context_writable(),
    }


def _merge_bridge_details(
    runtime_state: dict[str, Any],
    bridge_payload: dict[str, Any],
) -> dict[str, Any]:
    details = _base_details(runtime_state)
    bridge_details = bridge_payload.get("details")
    if isinstance(bridge_details, dict):
        details.update(bridge_details)
    if "selected_entity_count" in details and "selected_entity_count_before_create" not in details:
        details["selected_entity_count_before_create"] = details["selected_entity_count"]
    active_level_path = details.get("active_level_path")
    if "level_path" not in details and isinstance(active_level_path, str) and active_level_path:
        details["level_path"] = active_level_path
    return details


def _response(
    *,
    command: dict[str, Any],
    started_at: str,
    success: bool,
    status: str,
    result_summary: str,
    details: dict[str, Any],
    error_code: str | None = None,
) -> dict[str, Any]:
    response: dict[str, Any] = {
        "protocol_version": PROTOCOL_VERSION,
        "bridge_command_id": command.get("bridge_command_id"),
        "request_id": command.get("request_id"),
        "operation": command.get("operation"),
        "success": success,
        "status": status,
        "bridge_name": BRIDGE_NAME,
        "bridge_version": BRIDGE_VERSION,
        "started_at": started_at,
        "finished_at": utc_now(),
        "result_summary": result_summary,
        "details": details,
        "evidence_refs": [],
    }
    if error_code:
        response["error_code"] = error_code
    return response


def _resolve_requested_level(project_root: str, requested_level: str) -> Path:
    requested_path = Path(requested_level)
    if requested_path.is_absolute():
        return requested_path
    return Path(project_root) / requested_path


def _idle_wait(seconds: float) -> None:
    if not _editor_available():
        return
    try:
        general.idle_wait(seconds)
    except Exception:
        pass


def _normalize_level_path(value: str | Path) -> str:
    return Path(value).as_posix().lower()


def _canonicalize_component_names(
    components: Any,
) -> tuple[list[str], list[str], list[str]]:
    if not isinstance(components, list):
        return [], [], []

    canonical_components: list[str] = []
    unsupported_components: list[str] = []
    duplicate_components: list[str] = []
    seen_components: set[str] = set()

    for component_value in components:
        if not isinstance(component_value, str):
            unsupported_components.append(str(component_value))
            continue

        normalized_component = component_value.strip()
        if not normalized_component:
            unsupported_components.append(normalized_component)
            continue

        canonical_component = COMPONENT_ADD_ALLOWLIST_LOOKUP.get(
            normalized_component.casefold()
        )
        if canonical_component is None:
            unsupported_components.append(normalized_component)
            continue

        if canonical_component in seen_components:
            duplicate_components.append(canonical_component)
            continue

        seen_components.add(canonical_component)
        canonical_components.append(canonical_component)

    return canonical_components, unsupported_components, duplicate_components


ENTITY_ID_CACHE: dict[str, Any] = {}
COMPONENT_PAIR_CACHE: dict[str, Any] = {}


def _is_entity_id_like(value: Any) -> bool:
    return callable(getattr(value, "IsValid", None)) and callable(getattr(value, "ToString", None))


def _normalize_entity_id_text(value: Any) -> str | None:
    if _is_entity_id_like(value):
        if not value.IsValid():
            return None
        value = value.ToString()
    elif isinstance(value, int):
        value = str(value)
    elif not isinstance(value, str):
        return None

    candidate = value.strip()
    if candidate.startswith("EntityId(") and candidate.endswith(")"):
        candidate = candidate[len("EntityId(") : -1].strip()
    if candidate.startswith("[") and candidate.endswith("]"):
        candidate = candidate[1:-1].strip()
    if not candidate or not candidate.isdigit():
        return None
    return candidate


def _entity_id_cache_keys(*values: Any) -> list[str]:
    cache_keys: set[str] = set()
    for value in values:
        normalized_candidate = _normalize_entity_id_text(value)
        if normalized_candidate is not None:
            cache_keys.add(normalized_candidate)
            cache_keys.add(f"[{normalized_candidate}]")
            cache_keys.add(f"EntityId({normalized_candidate})")
        elif isinstance(value, str):
            stripped_value = value.strip()
            if stripped_value:
                cache_keys.add(stripped_value)
    return sorted(cache_keys)


def _remember_entity_id(entity_id: Any, *aliases: Any) -> list[str]:
    if not _is_entity_id_like(entity_id) or not entity_id.IsValid():
        return []
    cache_keys = _entity_id_cache_keys(entity_id, *aliases)
    for cache_key in cache_keys:
        ENTITY_ID_CACHE[cache_key] = entity_id
    return cache_keys


def _coerce_entity_id(value: Any, *, entity_name_hint: str | None = None) -> tuple[EntityId | None, dict[str, Any]]:
    resolution_details: dict[str, Any] = {
        "requested_entity_id": value,
        "entity_resolution_attempts": [],
    }
    if not _editor_available():
        resolution_details["entity_resolution_path"] = "editor-unavailable"
        return None, resolution_details

    if _is_entity_id_like(value):
        if value.IsValid():
            resolution_details["requested_entity_id_normalized"] = _normalize_entity_id_text(value)
            resolution_details["matched_entity_id"] = value.ToString()
            resolution_details["entity_resolution_path"] = "direct-entity-id-object"
            resolution_details["entity_id_cache_keys"] = _remember_entity_id(value)
            return value, resolution_details
        resolution_details["entity_resolution_path"] = "invalid-entity-id-object"
        return None, resolution_details

    normalized_candidate = _normalize_entity_id_text(value)
    resolution_details["requested_entity_id_normalized"] = normalized_candidate
    if normalized_candidate is None:
        resolution_details["entity_resolution_path"] = "invalid-request-shape"
        return None, resolution_details

    cache_keys = _entity_id_cache_keys(value)
    resolution_details["entity_cache_keys"] = cache_keys
    resolution_details["entity_cache_size"] = len(ENTITY_ID_CACHE)
    resolution_details["entity_resolution_attempts"].append("entity_id_cache")
    for cache_key in cache_keys:
        cached_entity_id = ENTITY_ID_CACHE.get(cache_key)
        if not _is_entity_id_like(cached_entity_id) or not cached_entity_id.IsValid():
            continue
        try:
            cached_entity_exists = editor.ToolsApplicationRequestBus(
                bus.Broadcast,
                "EntityExists",
                cached_entity_id,
            )
        except Exception as exc:
            resolution_details["entity_cache_exists_exception"] = repr(exc)
            continue
        if not cached_entity_exists:
            ENTITY_ID_CACHE.pop(cache_key, None)
            continue
        resolution_details["entity_cache_hit"] = True
        resolution_details["entity_cache_hit_key"] = cache_key
        resolution_details["matched_entity_id"] = cached_entity_id.ToString()
        resolution_details["matched_entity_exists"] = bool(cached_entity_exists)
        resolution_details["entity_resolution_path"] = "entity_id_cache"
        resolution_details["entity_id_cache_keys"] = _remember_entity_id(cached_entity_id, value)
        return cached_entity_id, resolution_details
    resolution_details["entity_cache_hit"] = False

    resolution_details["entity_resolution_attempts"].append("entity_id_constructor")
    try:
        constructed_entity_id = EntityId(int(normalized_candidate))
    except Exception as exc:
        resolution_details["constructor_exception"] = repr(exc)
    else:
        resolution_details["constructed_entity_id"] = constructed_entity_id.ToString()
        resolution_details["constructed_entity_id_valid"] = bool(
            constructed_entity_id and constructed_entity_id.IsValid()
        )
        if constructed_entity_id and constructed_entity_id.IsValid():
            try:
                constructed_entity_exists = editor.ToolsApplicationRequestBus(
                    bus.Broadcast,
                    "EntityExists",
                    constructed_entity_id,
                )
            except Exception as exc:
                resolution_details["constructed_entity_exists_exception"] = repr(exc)
            else:
                resolution_details["constructed_entity_exists"] = bool(constructed_entity_exists)
                if constructed_entity_exists:
                    resolution_details["matched_entity_id"] = constructed_entity_id.ToString()
                    resolution_details["entity_resolution_path"] = "entity_id_constructor"
                    resolution_details["entity_id_cache_keys"] = _remember_entity_id(
                        constructed_entity_id,
                        value,
                    )
                    return constructed_entity_id, resolution_details

    resolution_details["entity_resolution_attempts"].append("search_entities")
    try:
        search_results = entity.SearchBus(bus.Broadcast, "SearchEntities", entity.SearchFilter())
    except Exception as exc:
        resolution_details["search_entities_exception"] = repr(exc)
        resolution_details["entity_resolution_path"] = "search-entities-failed"
        return None, resolution_details

    if isinstance(search_results, list):
        search_candidates = search_results
    elif search_results is None:
        search_candidates = []
    else:
        try:
            search_candidates = list(search_results)
        except TypeError:
            search_candidates = []

    resolution_details["search_entities_count"] = len(search_candidates)
    requested_text_variants = {
        normalized_candidate,
        f"[{normalized_candidate}]",
        f"EntityId({normalized_candidate})",
    }
    search_candidate_preview: list[dict[str, Any]] = []
    for candidate_entity_id in search_candidates:
        if _is_entity_id_like(candidate_entity_id):
            if not candidate_entity_id.IsValid():
                continue
        try:
            candidate_text = candidate_entity_id.ToString()
        except Exception:
            continue
        if len(search_candidate_preview) < 10:
            preview_entry: dict[str, Any] = {"entity_id": candidate_text}
            candidate_name = _entity_name(candidate_entity_id)
            if isinstance(candidate_name, str) and candidate_name:
                preview_entry["entity_name"] = candidate_name
            search_candidate_preview.append(preview_entry)
        candidate_normalized = _normalize_entity_id_text(candidate_text)
        if candidate_text not in requested_text_variants and candidate_normalized != normalized_candidate:
            continue
        try:
            candidate_exists = editor.ToolsApplicationRequestBus(
                bus.Broadcast,
                "EntityExists",
                candidate_entity_id,
            )
        except Exception as exc:
            resolution_details["search_match_entity_exists_exception"] = repr(exc)
            continue
        if not candidate_exists:
            continue
        resolution_details["matched_entity_id"] = candidate_text
        resolution_details["matched_entity_exists"] = bool(candidate_exists)
        resolution_details["entity_resolution_path"] = "search_entities_match"
        resolution_details["entity_id_cache_keys"] = _remember_entity_id(
            candidate_entity_id,
            value,
        )
        return candidate_entity_id, resolution_details

    resolution_details["search_candidate_preview"] = search_candidate_preview

    if isinstance(entity_name_hint, str) and entity_name_hint:
        resolution_details["entity_name_hint"] = entity_name_hint
        resolution_details["entity_resolution_attempts"].append("entity_name_hint")
        search_filter = entity.SearchFilter()
        search_filter.names = [entity_name_hint]
        search_filter.names_case_sensitive = True
        try:
            name_search_results = entity.SearchBus(bus.Broadcast, "SearchEntities", search_filter)
        except Exception as exc:
            resolution_details["entity_name_hint_search_exception"] = repr(exc)
        else:
            if isinstance(name_search_results, list):
                name_search_candidates = name_search_results
            elif name_search_results is None:
                name_search_candidates = []
            else:
                try:
                    name_search_candidates = list(name_search_results)
                except TypeError:
                    name_search_candidates = []

            resolution_details["entity_name_hint_search_count"] = len(name_search_candidates)
            name_search_preview: list[dict[str, Any]] = []
            valid_name_candidates: list[EntityId] = []
            matching_name_candidate = None
            for candidate_entity_id in name_search_candidates:
                if not _is_entity_id_like(candidate_entity_id) or not candidate_entity_id.IsValid():
                    continue
                candidate_text = candidate_entity_id.ToString()
                candidate_name = _entity_name(candidate_entity_id)
                if len(name_search_preview) < 10:
                    name_search_preview.append(
                        {
                            "entity_id": candidate_text,
                            "entity_name": candidate_name,
                        }
                    )
                try:
                    candidate_exists = editor.ToolsApplicationRequestBus(
                        bus.Broadcast,
                        "EntityExists",
                        candidate_entity_id,
                    )
                except Exception:
                    candidate_exists = False
                if not candidate_exists or candidate_name != entity_name_hint:
                    continue
                valid_name_candidates.append(candidate_entity_id)
                if normalized_candidate is not None and _normalize_entity_id_text(candidate_text) == normalized_candidate:
                    matching_name_candidate = candidate_entity_id
                    resolution_details["entity_resolution_path"] = "entity_name_hint_id_match"
                    break

            resolution_details["entity_name_hint_search_candidates"] = name_search_preview
            if matching_name_candidate is None and len(valid_name_candidates) == 1:
                matching_name_candidate = valid_name_candidates[0]
                resolution_details["entity_resolution_path"] = "entity_name_hint_single_candidate"

            if matching_name_candidate is not None:
                resolution_details["matched_entity_id"] = matching_name_candidate.ToString()
                resolution_details["matched_entity_name"] = _entity_name(matching_name_candidate)
                resolution_details["entity_id_cache_keys"] = _remember_entity_id(
                    matching_name_candidate,
                    value,
                    entity_name_hint,
                )
                resolved_normalized = _normalize_entity_id_text(matching_name_candidate)
                resolution_details["entity_name_hint_id_mismatch"] = (
                    normalized_candidate is not None and resolved_normalized != normalized_candidate
                )
                return matching_name_candidate, resolution_details

    resolution_details["entity_resolution_path"] = "unresolved"
    return None, resolution_details


def _entity_name(entity_id: EntityId) -> str | None:
    if not _editor_available():
        return None
    try:
        entity_name = editor.EditorEntityInfoRequestBus(bus.Event, "GetName", entity_id)
    except Exception:
        return None
    return str(entity_name) if entity_name else None


def _resolve_component_type_id(component_name: str) -> Any | None:
    if not _editor_available():
        return None
    try:
        type_ids = editor.EditorComponentAPIBus(
            bus.Broadcast,
            "FindComponentTypeIdsByEntityType",
            [component_name],
            entity.EntityType().Game,
        )
    except Exception:
        return None
    if not isinstance(type_ids, list) or not type_ids:
        return None
    return type_ids[0]


def _is_component_pair_like(value: Any) -> bool:
    return callable(getattr(value, "get_entity_id", None)) and callable(
        getattr(value, "get_component_id", None)
    )


def _is_component_pair_cacheable(value: Any) -> bool:
    return value is not None


def _component_pair_entity_id(value: Any) -> Any | None:
    getter = getattr(value, "get_entity_id", None)
    if not callable(getter):
        return None
    try:
        return getter()
    except Exception:
        return None


def _component_pair_component_id(value: Any) -> int | None:
    getter = getattr(value, "get_component_id", None)
    if not callable(getter):
        return None
    try:
        component_id = getter()
    except Exception:
        return None
    if isinstance(component_id, int):
        return component_id
    if isinstance(component_id, str) and component_id.strip().isdigit():
        return int(component_id.strip())
    for method_name in ("ToString", "to_string"):
        method = getattr(component_id, method_name, None)
        if not callable(method):
            continue
        try:
            component_id_text = method()
        except Exception:
            continue
        if isinstance(component_id_text, str) and component_id_text.strip().isdigit():
            return int(component_id_text.strip())
    try:
        component_id_text = str(component_id)
    except Exception:
        return None
    if component_id_text.strip().isdigit():
        return int(component_id_text.strip())
    return None


def _stringify_component_id_value(value: Any) -> str | None:
    if value is None:
        return None
    for method_name in ("ToString", "to_string"):
        method = getattr(value, method_name, None)
        if not callable(method):
            continue
        try:
            text = method()
        except Exception:
            continue
        if text is not None:
            return str(text)
    try:
        return str(value)
    except Exception:
        return None


def _component_pair_to_string(value: Any) -> str | None:
    if not _is_component_pair_like(value):
        return None
    for method_name in ("to_string", "ToString"):
        method = getattr(value, method_name, None)
        if not callable(method):
            continue
        try:
            result = method()
        except Exception:
            continue
        if result:
            return str(result)
    try:
        candidate = str(value)
    except Exception:
        candidate = None
    if isinstance(candidate, str) and COMPONENT_ID_PATTERN.match(candidate.strip()):
        return candidate.strip()
    entity_id = _component_pair_entity_id(value)
    component_id = _component_pair_component_id(value)
    entity_text = _normalize_entity_id_text(entity_id)
    if entity_text is None or component_id is None:
        return None
    return f"EntityComponentIdPair(EntityId({entity_text}), {component_id})"


def _parse_component_id(value: Any) -> tuple[str | None, int | None]:
    if _is_component_pair_like(value):
        return (
            _normalize_entity_id_text(_component_pair_entity_id(value)),
            _component_pair_component_id(value),
        )
    if not isinstance(value, str):
        return None, None
    match = COMPONENT_ID_PATTERN.match(value.strip())
    if match is None:
        return None, None
    entity_id = (
        match.group("entity_wrapped")
        or match.group("entity_bracket")
        or match.group("entity_plain")
    )
    component_id = match.group("component")
    if entity_id is None or component_id is None:
        return None, None
    return entity_id, int(component_id)


def _construct_component_pair(
    entity_id: EntityId,
    component_id: int,
) -> tuple[Any | None, dict[str, Any]]:
    construction_details: dict[str, Any] = {
        "component_pair_constructors_tried": [],
    }
    if entity is None:
        construction_details["component_pair_constructor_path"] = "entity-module-unavailable"
        return None, construction_details

    constructor = getattr(entity, "EntityComponentIdPair", None)
    if callable(constructor):
        construction_details["component_pair_constructors_tried"].append(
            "entity.EntityComponentIdPair(entity_id, component_id)"
        )
        try:
            component_pair = constructor(entity_id, component_id)
        except Exception as exc:
            construction_details["component_pair_constructor_exception"] = repr(exc)
        else:
            if _is_component_pair_like(component_pair):
                construction_details["component_pair_constructor_path"] = (
                    "entity.EntityComponentIdPair(entity_id, component_id)"
                )
                return component_pair, construction_details
            construction_details["component_pair_constructor_shape"] = (
                type(component_pair).__name__
            )

    construction_details["component_pair_constructor_path"] = "unavailable"
    return None, construction_details


def _normalize_component_id_text(value: Any) -> str | None:
    if _is_component_pair_like(value):
        return _component_pair_to_string(value)
    if not isinstance(value, str):
        return None
    candidate = value.strip()
    return candidate or None


def _component_pair_cache_keys(*values: Any) -> list[str]:
    cache_keys: set[str] = set()
    for value in values:
        candidate = _normalize_component_id_text(value)
        if candidate is not None:
            cache_keys.add(candidate)
        elif isinstance(value, str):
            stripped_value = value.strip()
            if stripped_value:
                cache_keys.add(stripped_value)
    return sorted(cache_keys)


def _remember_component_pair(component_pair: Any, *aliases: Any) -> list[str]:
    if not _is_component_pair_cacheable(component_pair):
        return []
    cache_keys = _component_pair_cache_keys(component_pair, *aliases)
    if not cache_keys:
        return []
    for cache_key in cache_keys:
        COMPONENT_PAIR_CACHE[cache_key] = component_pair
    return cache_keys


def _coerce_component_pair(value: Any) -> tuple[Any | None, dict[str, Any]]:
    resolution_details: dict[str, Any] = {
        "requested_component_id": value,
        "component_resolution_attempts": [],
    }
    if not _editor_available():
        resolution_details["component_resolution_path"] = "editor-unavailable"
        return None, resolution_details

    if _is_component_pair_like(value):
        component_pair = value
        entity_id = _component_pair_entity_id(component_pair)
        component_numeric_id = _component_pair_component_id(component_pair)
        resolution_details["component_resolution_attempts"].append("direct-component-pair")
    else:
        resolution_details["component_resolution_attempts"].append("component-id-parse")
        entity_text, component_numeric_id = _parse_component_id(value)
        resolution_details["requested_component_id_normalized"] = _normalize_component_id_text(
            value
        )
        resolution_details["requested_entity_id_normalized"] = entity_text
        resolution_details["requested_component_numeric_id"] = component_numeric_id
        if entity_text is None or component_numeric_id is None:
            resolution_details["component_resolution_path"] = "invalid-request-shape"
            return None, resolution_details

        component_pair = None
        bridge_pair_text = f"[ [{entity_text}] - {component_numeric_id} ]"
        cache_keys = _component_pair_cache_keys(value, bridge_pair_text)
        resolution_details["component_pair_cache_keys"] = cache_keys
        resolution_details["component_pair_cache_size"] = len(COMPONENT_PAIR_CACHE)
        resolution_details["component_resolution_attempts"].append("component-pair-cache")
        for cache_key in cache_keys:
            cached_component_pair = COMPONENT_PAIR_CACHE.get(cache_key)
            if not _is_component_pair_cacheable(cached_component_pair):
                continue
            resolution_details["component_pair_cache_hit"] = True
            resolution_details["component_pair_cache_hit_key"] = cache_key
            component_pair = cached_component_pair
            cached_component_id = _component_pair_component_id(cached_component_pair)
            if cached_component_id is not None:
                component_numeric_id = cached_component_id
            break

        if component_pair is not None:
            resolution_details["component_resolution_path"] = "component_pair_cache"
        else:
            resolution_details["component_pair_cache_hit"] = False

        resolution_details["component_resolution_attempts"].append("entity-id-resolution")
        entity_id, entity_resolution_details = _coerce_entity_id(entity_text)
        resolution_details["component_entity_resolution"] = entity_resolution_details
        if entity_id is None:
            resolution_details["component_resolution_path"] = "entity-not-found"
            return None, resolution_details
        resolution_details["entity_exists"] = True
        resolution_details["resolved_entity_id"] = entity_id.ToString()

        if component_pair is None:
            resolution_details["component_resolution_attempts"].append("component-pair-constructor")
            component_pair, construction_details = _construct_component_pair(
                entity_id,
                component_numeric_id,
            )
            resolution_details.update(construction_details)
            if component_pair is None:
                resolution_details["component_resolution_path"] = (
                    "component-pair-constructor-unavailable"
                )
                return None, resolution_details

    resolution_details["component_resolution_attempts"].append("component-validity-check")
    component_id_text = _component_pair_to_string(component_pair)
    if component_id_text is not None:
        resolution_details["component_id"] = component_id_text
    if component_numeric_id is not None:
        resolution_details["resolved_component_numeric_id"] = component_numeric_id

    entity_id = _component_pair_entity_id(component_pair)
    entity_id_text = _normalize_entity_id_text(entity_id)
    if entity_id_text is not None:
        if _is_entity_id_like(entity_id) and entity_id.IsValid():
            resolution_details["entity_id"] = entity_id.ToString()
            resolution_details["entity_id_cache_keys"] = _remember_entity_id(
                entity_id,
                value,
                component_id_text,
            )
        else:
            resolution_details["entity_id"] = str(entity_id)

    try:
        component_valid = editor.EditorComponentAPIBus(
            bus.Broadcast,
            "IsValid",
            component_pair,
        )
    except Exception as exc:
        resolution_details["component_validity_exception"] = repr(exc)
        resolution_details["component_resolution_path"] = "component-validity-exception"
        return None, resolution_details
    resolution_details["component_valid"] = bool(component_valid)
    if not component_valid:
        resolution_details["component_resolution_path"] = "component-not-found"
        return None, resolution_details

    resolution_details["component_resolution_path"] = "resolved"
    return component_pair, resolution_details


def _json_safe_value(value: Any) -> Any:
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if _is_entity_id_like(value):
        try:
            return value.ToString()
        except Exception:
            return str(value)
    if _is_component_pair_like(value):
        component_text = _component_pair_to_string(value)
        return component_text if component_text is not None else str(value)
    if isinstance(value, dict):
        return {str(key): _json_safe_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_safe_value(item) for item in value]
    for attribute_names in (
        ("x", "y", "z", "w"),
        ("x", "y", "z"),
        ("r", "g", "b", "a"),
        ("r", "g", "b"),
    ):
        if all(hasattr(value, attribute_name) for attribute_name in attribute_names):
            converted: dict[str, Any] = {}
            for attribute_name in attribute_names:
                try:
                    converted[attribute_name] = getattr(value, attribute_name)
                except Exception:
                    converted = {}
                    break
            if converted:
                return converted
    for method_name in ("ToString", "to_string"):
        method = getattr(value, method_name, None)
        if not callable(method):
            continue
        try:
            method_result = method()
        except Exception:
            continue
        if method_result is not None:
            return str(method_result)
    try:
        json.dumps(value)
    except TypeError:
        return str(value)
    return value


def _value_type_from_tree(component_pair: Any, property_path: str) -> str | None:
    try:
        property_tree_outcome = editor.EditorComponentAPIBus(
            bus.Broadcast,
            "BuildComponentPropertyTreeEditor",
            component_pair,
        )
    except Exception:
        return None
    if not property_tree_outcome.IsSuccess():
        return None
    try:
        property_tree = property_tree_outcome.GetValue()
        path_types = property_tree.build_paths_list_with_types()
    except Exception:
        return None
    if not isinstance(path_types, list):
        return None
    for path_entry in path_types:
        if not isinstance(path_entry, str):
            continue
        path_name, separator, typed_suffix = path_entry.rpartition(" (")
        if not separator or path_name != property_path or not typed_suffix.endswith(")"):
            continue
        type_name = typed_suffix[:-1].split(",", 1)[0].strip()
        return type_name or None
    return None


def _fallback_value_type(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return "bool"
    if isinstance(value, int):
        return "int"
    if isinstance(value, float):
        return "float"
    if isinstance(value, str):
        return "str"
    return type(value).__name__


def _split_typed_property_path(path_entry: Any) -> dict[str, Any]:
    raw_entry = "" if path_entry is None else str(path_entry)
    path = raw_entry
    value_type_hint = None
    visibility_hint = None
    path_name, separator, typed_suffix = raw_entry.rpartition(" (")
    if separator and typed_suffix.endswith(")"):
        path = path_name
        typed_parts = [part.strip() for part in typed_suffix[:-1].split(",")]
        value_type_hint = typed_parts[0] if typed_parts and typed_parts[0] else None
        visibility_hint = (
            typed_parts[1]
            if len(typed_parts) > 1 and typed_parts[1]
            else None
        )
    return {
        "raw_entry": raw_entry,
        "path": path.strip(),
        "value_type_hint": value_type_hint,
        "visibility_hint": visibility_hint,
    }


def _comment_path_review(path: str, value_type_hint: Any = None) -> dict[str, Any]:
    stripped_path = path.strip()
    lowered = stripped_path.lower()
    value_type_text = "" if value_type_hint is None else str(value_type_hint).lower()
    if not stripped_path:
        return {
            "readback_candidate": False,
            "evidence_class": "empty_or_unreviewable_property_path",
            "reason": (
                "The live API exposed an empty Comment property path; record it as "
                "evidence, but do not treat it as a stable operator target."
            ),
        }
    if any(marker in lowered for marker in COMMENT_REJECT_PATH_MARKERS):
        return {
            "readback_candidate": False,
            "evidence_class": "out_of_scope_property_path",
            "reason": (
                "The path is asset, material, render, transform, or derived-stat "
                "adjacent and is outside the Comment scalar proof boundary."
            ),
        }
    preferred = any(marker in lowered for marker in COMMENT_PREFERRED_PATH_MARKERS)
    scalar_hint = any(
        marker in value_type_text for marker in COMMENT_SCALAR_VALUE_TYPE_MARKERS
    )
    return {
        "readback_candidate": True,
        "evidence_class": (
            "preferred_text_like_candidate"
            if preferred or scalar_hint
            else "non_render_candidate_requires_readback"
        ),
        "reason": (
            "The path is non-asset and non-render by name; live value readback must "
            "still prove scalar/text-like type before any future write proof."
        ),
    }


def _comment_value_is_scalar_or_text_like(value: Any, value_type: Any) -> bool:
    if isinstance(value, (str, bool, int, float)):
        return True
    value_type_text = "" if value_type is None else str(value_type).lower()
    return value is None and any(
        marker in value_type_text for marker in COMMENT_SCALAR_VALUE_TYPE_MARKERS
    )


def _comment_discovery_rank(attempt: dict[str, Any]) -> tuple[int, int, str]:
    source = str(attempt.get("source") or "")
    value_type = str(attempt.get("value_type") or "").lower()
    path = str(attempt.get("property_path") or "")
    preferred_type = 0 if "string" in value_type or value_type == "str" else 1
    source_rank = 0 if source != "source_guided_comment_readback_candidate" else 1
    return (source_rank, preferred_type, path.lower())


def _build_property_list_evidence(component_pair: Any) -> tuple[list[Any] | None, dict[str, Any]]:
    evidence: dict[str, Any] = {"method": "BuildComponentPropertyList"}
    try:
        property_paths = editor.EditorComponentAPIBus(
            bus.Broadcast,
            "BuildComponentPropertyList",
            component_pair,
        )
    except Exception as exc:
        evidence.update(
            {
                "success": False,
                "exception": repr(exc),
                "returned_type": None,
                "path_count": None,
                "raw_path_preview": [],
            }
        )
        return None, evidence

    evidence["returned_type"] = type(property_paths).__name__
    if not isinstance(property_paths, list):
        evidence.update(
            {
                "success": False,
                "path_count": None,
                "raw_path_preview": [],
            }
        )
        return None, evidence
    preview = [str(path) for path in property_paths[:25]]
    evidence.update(
        {
            "success": True,
            "path_count": len(property_paths),
            "raw_path_preview": preview,
            "empty_path_count": sum(1 for path in property_paths if not str(path).strip()),
        }
    )
    return property_paths, evidence


def _build_property_tree_evidence(component_pair: Any) -> dict[str, Any]:
    evidence: dict[str, Any] = {
        "method": "BuildComponentPropertyTreeEditor",
        "tree_success": False,
        "paths_with_types_count": None,
        "paths_count": None,
        "raw_typed_paths": [],
        "raw_paths": [],
        "raw_typed_path_preview": [],
        "raw_path_preview": [],
        "root_candidate_detected": False,
        "root_candidate_type_hint": None,
        "root_candidate_visibility": None,
        "root_property_tree_get_value_attempted": False,
        "root_property_tree_get_value_success": False,
        "root_property_tree_get_value_preview": None,
    }
    try:
        property_tree_outcome = editor.EditorComponentAPIBus(
            bus.Broadcast,
            "BuildComponentPropertyTreeEditor",
            component_pair,
        )
    except Exception as exc:
        evidence["tree_exception"] = repr(exc)
        return evidence

    if not property_tree_outcome.IsSuccess():
        try:
            evidence["tree_error"] = str(property_tree_outcome.GetError())
        except Exception:
            pass
        return evidence

    evidence["tree_success"] = True
    property_tree = property_tree_outcome.GetValue()
    try:
        paths_with_types = property_tree.build_paths_list_with_types()
    except Exception as exc:
        evidence["paths_with_types_exception"] = repr(exc)
        paths_with_types = None
    if isinstance(paths_with_types, list):
        evidence["raw_typed_paths"] = [str(path_entry) for path_entry in paths_with_types]
        evidence["paths_with_types_count"] = len(paths_with_types)
        evidence["raw_typed_path_preview"] = [
            str(path_entry) for path_entry in paths_with_types[:25]
        ]
    else:
        evidence["paths_with_types_shape"] = type(paths_with_types).__name__

    try:
        paths = property_tree.build_paths_list()
    except Exception as exc:
        evidence["paths_exception"] = repr(exc)
        paths = None
    if isinstance(paths, list):
        evidence["raw_paths"] = [str(path_entry) for path_entry in paths]
        evidence["paths_count"] = len(paths)
        evidence["raw_path_preview"] = [str(path_entry) for path_entry in paths[:25]]
    else:
        evidence["paths_shape"] = type(paths).__name__

    root_candidate: dict[str, Any] | None = None
    if isinstance(paths_with_types, list):
        for path_entry in paths_with_types:
            parsed = _split_typed_property_path(path_entry)
            type_hint_text = str(parsed.get("value_type_hint") or "").lower()
            visibility_text = str(parsed.get("visibility_hint") or "").lower()
            visibility_ok = not visibility_text or "visible" in visibility_text
            string_like = any(
                marker in type_hint_text
                for marker in ("string", "azstd::string")
            )
            if parsed.get("path") == "" and string_like and visibility_ok:
                root_candidate = parsed
                break

    if root_candidate is None:
        return evidence

    evidence.update(
        {
            "root_candidate_detected": True,
            "root_candidate_type_hint": root_candidate.get("value_type_hint"),
            "root_candidate_visibility": root_candidate.get("visibility_hint"),
            "root_candidate_raw_entry": root_candidate.get("raw_entry"),
            "root_property_tree_get_value_attempted": True,
        }
    )
    try:
        root_value = property_tree.get_value("")
    except Exception as exc:
        evidence.update(
            {
                "root_property_tree_get_value_success": False,
                "root_property_tree_get_value_exception": repr(exc),
            }
        )
        return evidence

    serialized_value = _json_safe_value(root_value)
    value_type = root_candidate.get("value_type_hint") or _fallback_value_type(root_value)
    scalar_or_text_like = _comment_value_is_scalar_or_text_like(
        serialized_value,
        value_type,
    )
    value_preview = None if serialized_value is None else str(serialized_value)[:160]
    evidence.update(
        {
            "root_property_tree_get_value_success": True,
            "root_property_tree_get_value_preview": value_preview,
            "root_property_tree_value": serialized_value,
            "root_property_tree_value_type": value_type,
            "root_property_tree_scalar_or_text_like": scalar_or_text_like,
        }
    )
    if scalar_or_text_like:
        evidence["root_selected_candidate"] = {
            "property_path": "",
            "property_path_kind": "property_tree_root",
            "display_label": "Comment root text",
            "discovery_method": "BuildComponentPropertyTreeEditor.get_value",
            "source": "PropertyTreeEditor.get_value",
            "property_tree_get_value_attempted": True,
            "root_property_tree_get_value_success": True,
            "get_component_property_attempted": False,
            "set_component_property_attempted": False,
            "success": True,
            "value": serialized_value,
            "value_type": value_type,
            "value_type_hint": root_candidate.get("value_type_hint"),
            "visibility": root_candidate.get("visibility_hint"),
            "scalar_or_text_like": scalar_or_text_like,
            "target_status": "readback_only_candidate",
            "write_target_admitted": False,
            "write_admission": False,
            "property_list_admission": False,
        }
    return evidence


def _normalize_comment_discovery_entries(
    property_paths: list[Any] | None,
    tree_evidence: dict[str, Any],
) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    seen: set[tuple[str, str | None, str]] = set()

    def add_entry(source: str, raw_entry: Any, typed: bool = False) -> None:
        parsed = _split_typed_property_path(raw_entry) if typed else {
            "raw_entry": "" if raw_entry is None else str(raw_entry),
            "path": ("" if raw_entry is None else str(raw_entry)).strip(),
            "value_type_hint": None,
        }
        key = (parsed["path"], parsed.get("value_type_hint"), source)
        if key in seen:
            return
        seen.add(key)
        review = _comment_path_review(parsed["path"], parsed.get("value_type_hint"))
        entries.append(
            {
                "source": source,
                "raw_entry": parsed["raw_entry"],
                "property_path": parsed["path"],
                "value_type_hint": parsed.get("value_type_hint"),
                "visibility_hint": parsed.get("visibility_hint"),
                **review,
            }
        )

    if isinstance(property_paths, list):
        for path in property_paths:
            add_entry("BuildComponentPropertyList", path)

    for path in tree_evidence.get("raw_path_preview", []):
        add_entry("PropertyTreeEditor.build_paths_list", path)
    for path in tree_evidence.get("raw_typed_path_preview", []):
        add_entry("PropertyTreeEditor.build_paths_list_with_types", path, typed=True)
    return entries


def _read_comment_property_candidate(
    component_pair: Any,
    property_path: str,
    *,
    source: str,
    value_type_hint: Any = None,
) -> dict[str, Any]:
    attempt: dict[str, Any] = {
        "property_path": property_path,
        "source": source,
        "get_component_property_attempted": True,
        "set_component_property_attempted": False,
        "success": False,
        "write_target_admitted": False,
    }
    review = _comment_path_review(property_path, value_type_hint)
    attempt.update(review)
    if review["readback_candidate"] is not True:
        attempt["get_component_property_attempted"] = False
        return attempt
    try:
        property_outcome = editor.EditorComponentAPIBus(
            bus.Broadcast,
            "GetComponentProperty",
            component_pair,
            property_path,
        )
    except Exception as exc:
        attempt["exception"] = repr(exc)
        return attempt
    if not property_outcome.IsSuccess():
        try:
            attempt["error"] = str(property_outcome.GetError())
        except Exception:
            pass
        return attempt

    value = property_outcome.GetValue()
    serialized_value = _json_safe_value(value)
    value_type = _value_type_from_tree(component_pair, property_path)
    if value_type is None:
        value_type = value_type_hint or _fallback_value_type(value)
    attempt.update(
        {
            "success": True,
            "value": serialized_value,
            "value_type": value_type,
            "scalar_or_text_like": _comment_value_is_scalar_or_text_like(
                serialized_value,
                value_type,
            ),
            "target_status": "readback_only_candidate",
            "write_admission": False,
            "property_list_admission": False,
        }
    )
    return attempt


def _comment_source_guided_paths(command: dict[str, Any]) -> list[str]:
    raw_paths = command.get("args", {}).get("source_guided_readback_paths")
    if not isinstance(raw_paths, list):
        return list(COMMENT_SCALAR_SOURCE_GUIDED_PATHS)
    paths: list[str] = []
    for raw_path in raw_paths:
        if not isinstance(raw_path, str):
            continue
        stripped = raw_path.strip()
        if stripped and stripped not in paths:
            paths.append(stripped)
    return paths or list(COMMENT_SCALAR_SOURCE_GUIDED_PATHS)


def _run_comment_scalar_discovery_ladder(
    command: dict[str, Any],
    component_pair: Any,
    property_paths: list[Any] | None,
    property_list_evidence: dict[str, Any],
) -> dict[str, Any]:
    tree_evidence = _build_property_tree_evidence(component_pair)
    entries = _normalize_comment_discovery_entries(property_paths, tree_evidence)
    readback_attempts: list[dict[str, Any]] = []
    attempted_paths: set[str] = set()
    root_candidate_detected = tree_evidence.get("root_candidate_detected") is True
    root_get_value_attempted = (
        tree_evidence.get("root_property_tree_get_value_attempted") is True
    )
    root_get_value_success = (
        tree_evidence.get("root_property_tree_get_value_success") is True
    )
    root_value_scalar_or_text_like = (
        tree_evidence.get("root_property_tree_scalar_or_text_like") is True
    )
    selected = tree_evidence.get("root_selected_candidate")
    if not (
        isinstance(selected, dict)
        and selected.get("success") is True
        and selected.get("scalar_or_text_like") is True
    ):
        selected = None

    if selected is None:
        for entry in entries:
            if entry.get("readback_candidate") is not True:
                continue
            property_path = str(entry.get("property_path") or "").strip()
            if not property_path or property_path in attempted_paths:
                continue
            attempted_paths.add(property_path)
            readback_attempts.append(
                _read_comment_property_candidate(
                    component_pair,
                    property_path,
                    source=str(entry.get("source") or "live_property_discovery"),
                    value_type_hint=entry.get("value_type_hint"),
                )
            )
        selected = next(
            (
                attempt
                for attempt in sorted(readback_attempts, key=_comment_discovery_rank)
                if attempt.get("success") is True
                and attempt.get("scalar_or_text_like") is True
            ),
            None,
        )

    source_guided_fallback_attempted = False
    source_guided_attempts: list[dict[str, Any]] = []
    if selected is None:
        source_guided_fallback_attempted = True
        for property_path in _comment_source_guided_paths(command):
            if property_path in attempted_paths:
                continue
            attempted_paths.add(property_path)
            attempt = _read_comment_property_candidate(
                component_pair,
                property_path,
                source="source_guided_comment_readback_candidate",
            )
            source_guided_attempts.append(attempt)
        selected = next(
            (
                attempt
                for attempt in sorted(source_guided_attempts, key=_comment_discovery_rank)
                if attempt.get("success") is True
                and attempt.get("scalar_or_text_like") is True
            ),
            None,
        )

    tree_worked = tree_evidence.get("tree_success") is True
    list_worked = property_list_evidence.get("success") is True
    any_live_paths = any(str(entry.get("property_path") or "").strip() for entry in entries)
    if selected is not None:
        status = "candidate_selected_readback_only"
        blocker_code = None
    elif not list_worked and not tree_worked:
        status = "blocked"
        blocker_code = "comment_property_tree_unavailable"
    elif (
        root_candidate_detected
        and root_get_value_attempted
        and not (root_get_value_success and root_value_scalar_or_text_like)
    ):
        status = "blocked"
        blocker_code = "comment_root_string_readback_failed"
    elif source_guided_fallback_attempted and source_guided_attempts:
        status = "blocked"
        blocker_code = "comment_source_guided_readback_failed"
    elif any_live_paths:
        status = "blocked"
        blocker_code = "comment_scalar_candidate_not_found"
    else:
        status = "blocked"
        blocker_code = "comment_scalar_candidate_not_found"

    return {
        "component_family": "Comment",
        "status": status,
        "blocker_code": blocker_code,
        "build_component_property_list": property_list_evidence,
        "build_component_property_tree_editor": tree_evidence,
        "normalized_entries": entries,
        "root_candidate_detected": root_candidate_detected,
        "root_candidate_type_hint": tree_evidence.get("root_candidate_type_hint"),
        "root_candidate_visibility": tree_evidence.get("root_candidate_visibility"),
        "root_property_tree_get_value_attempted": root_get_value_attempted,
        "root_property_tree_get_value_success": root_get_value_success,
        "root_property_tree_scalar_or_text_like": root_value_scalar_or_text_like,
        "root_property_tree_get_value_preview": tree_evidence.get(
            "root_property_tree_get_value_preview"
        ),
        "readback_attempts": readback_attempts,
        "source_guided_fallback_attempted": source_guided_fallback_attempted,
        "source_guided_readback_attempts": source_guided_attempts,
        "selected_candidate": selected,
        "target_selected": selected is not None,
        "future_write_candidate_selected": selected is not None,
        "write_target_admitted": False,
        "write_admission": False,
        "property_list_admission": False,
        "set_component_property_attempted": False,
    }


def _scalar_target_value_shape(value: Any) -> str:
    if isinstance(value, dict):
        keys = {str(key).lower() for key in value}
        if keys and keys.issubset({"x", "y", "z", "w"}):
            return "xyzw_object"
        if keys and keys.issubset({"r", "g", "b", "a"}):
            return "rgba_object"
        return "object"
    if isinstance(value, list):
        return "list"
    if isinstance(value, tuple):
        return "tuple"
    if isinstance(value, set):
        return "set"
    return "scalar" if isinstance(value, (str, bool, int, float)) else type(value).__name__


def _scalar_target_value_is_scalar_or_text_like(value: Any, value_type: Any) -> bool:
    if isinstance(value, (str, bool, int, float)):
        return True
    value_type_text = "" if value_type is None else str(value_type).lower()
    return value is None and any(
        marker in value_type_text for marker in SCALAR_TARGET_VALUE_TYPE_MARKERS
    )


def _scalar_target_path_prefixes(property_paths: list[str]) -> set[str]:
    return {
        "|".join(parts[:index])
        for path in property_paths
        for parts in [path.split("|")]
        for index in range(1, len(parts))
    }


def _scalar_target_path_review(
    path: str,
    *,
    value_type_hint: Any = None,
    visibility_hint: Any = None,
    path_prefixes: set[str] | None = None,
) -> dict[str, Any]:
    stripped_path = path.strip()
    lowered = stripped_path.lower()
    value_type_text = "" if value_type_hint is None else str(value_type_hint).lower()
    visibility_text = "" if visibility_hint is None else str(visibility_hint).lower()
    if not stripped_path:
        return {
            "readback_candidate": False,
            "evidence_class": "empty_property_path_evidence",
            "reason": "Empty/root paths are recorded as evidence only and are not selected.",
        }
    if path_prefixes and stripped_path in path_prefixes:
        return {
            "readback_candidate": False,
            "evidence_class": "container_or_group",
            "reason": "Grouping paths are not concrete scalar property targets.",
        }
    if visibility_text and "visible" not in visibility_text:
        return {
            "readback_candidate": False,
            "evidence_class": "hidden_or_unavailable_property_path",
            "reason": "The property tree reported a non-visible path.",
        }
    if any(marker in lowered for marker in SCALAR_TARGET_REJECT_PATH_MARKERS):
        return {
            "readback_candidate": False,
            "evidence_class": "out_of_scope_property_path",
            "reason": "The path is asset, material, mesh/model, render, or transform adjacent.",
        }
    if any(marker in value_type_text for marker in SCALAR_TARGET_REJECT_TYPE_MARKERS):
        return {
            "readback_candidate": False,
            "evidence_class": "out_of_scope_value_type",
            "reason": "The value type hint is vector, color, transform, asset, or container adjacent.",
        }
    scalar_hint = any(
        marker in value_type_text for marker in SCALAR_TARGET_VALUE_TYPE_MARKERS
    )
    return {
        "readback_candidate": True,
        "evidence_class": (
            "scalar_or_text_like_candidate"
            if scalar_hint
            else "non_asset_non_render_candidate_requires_readback"
        ),
        "reason": "The path passed proof-only name/type screening; live readback must still prove scalar shape.",
    }


def _normalize_scalar_target_entries(
    property_paths: list[Any] | None,
    tree_evidence: dict[str, Any],
    *,
    component_family: str,
) -> list[dict[str, Any]]:
    raw_items: list[tuple[str, Any, bool]] = []
    if isinstance(property_paths, list):
        raw_items.extend(("BuildComponentPropertyList", path, False) for path in property_paths)
    tree_paths = tree_evidence.get("raw_paths")
    if not isinstance(tree_paths, list):
        tree_paths = tree_evidence.get("raw_path_preview", [])
    raw_items.extend(
        ("PropertyTreeEditor.build_paths_list", path, False) for path in tree_paths
    )
    typed_tree_paths = tree_evidence.get("raw_typed_paths")
    if not isinstance(typed_tree_paths, list):
        typed_tree_paths = tree_evidence.get("raw_typed_path_preview", [])
    raw_items.extend(
        ("PropertyTreeEditor.build_paths_list_with_types", path, True)
        for path in typed_tree_paths
    )

    non_empty_paths: list[str] = []
    for _, raw_entry, typed in raw_items:
        parsed = _split_typed_property_path(raw_entry) if typed else {
            "path": ("" if raw_entry is None else str(raw_entry)).strip()
        }
        path = str(parsed.get("path") or "").strip()
        if path:
            non_empty_paths.append(path)
    path_prefixes = _scalar_target_path_prefixes(non_empty_paths)

    entries: list[dict[str, Any]] = []
    seen: set[tuple[str, str | None, str]] = set()
    for source, raw_entry, typed in raw_items:
        parsed = _split_typed_property_path(raw_entry) if typed else {
            "raw_entry": "" if raw_entry is None else str(raw_entry),
            "path": ("" if raw_entry is None else str(raw_entry)).strip(),
            "value_type_hint": None,
            "visibility_hint": None,
        }
        property_path = str(parsed.get("path") or "").strip()
        value_type_hint = parsed.get("value_type_hint")
        key = (property_path, value_type_hint, source)
        if key in seen:
            continue
        seen.add(key)
        review = _scalar_target_path_review(
            property_path,
            value_type_hint=value_type_hint,
            visibility_hint=parsed.get("visibility_hint"),
            path_prefixes=path_prefixes,
        )
        entries.append(
            {
                "component_name": component_family,
                "source": source,
                "discovery_method": source,
                "raw_entry": parsed.get("raw_entry"),
                "property_path": property_path,
                "property_path_kind": (
                    "property_tree_root" if property_path == "" else "named_component_property"
                ),
                "value_type_hint": value_type_hint,
                "visibility_hint": parsed.get("visibility_hint"),
                **review,
            }
        )
    return entries


def _build_scalar_property_tree_evidence(component_pair: Any) -> tuple[Any | None, dict[str, Any]]:
    evidence: dict[str, Any] = {
        "method": "BuildComponentPropertyTreeEditor",
        "tree_success": False,
        "paths_with_types_count": None,
        "paths_count": None,
        "raw_typed_paths": [],
        "raw_paths": [],
        "raw_typed_path_preview": [],
        "raw_path_preview": [],
    }
    try:
        property_tree_outcome = editor.EditorComponentAPIBus(
            bus.Broadcast,
            "BuildComponentPropertyTreeEditor",
            component_pair,
        )
    except Exception as exc:
        evidence["tree_exception"] = repr(exc)
        return None, evidence
    if not property_tree_outcome.IsSuccess():
        try:
            evidence["tree_error"] = str(property_tree_outcome.GetError())
        except Exception:
            pass
        return None, evidence
    property_tree = property_tree_outcome.GetValue()
    evidence["tree_success"] = True
    try:
        paths_with_types = property_tree.build_paths_list_with_types()
    except Exception as exc:
        evidence["paths_with_types_exception"] = repr(exc)
        paths_with_types = None
    if isinstance(paths_with_types, list):
        evidence["raw_typed_paths"] = [str(path_entry) for path_entry in paths_with_types]
        evidence["paths_with_types_count"] = len(paths_with_types)
        evidence["raw_typed_path_preview"] = evidence["raw_typed_paths"][:25]
    else:
        evidence["paths_with_types_shape"] = type(paths_with_types).__name__

    try:
        paths = property_tree.build_paths_list()
    except Exception as exc:
        evidence["paths_exception"] = repr(exc)
        paths = None
    if isinstance(paths, list):
        evidence["raw_paths"] = [str(path_entry) for path_entry in paths]
        evidence["paths_count"] = len(paths)
        evidence["raw_path_preview"] = evidence["raw_paths"][:25]
    else:
        evidence["paths_shape"] = type(paths).__name__
    return property_tree, evidence


def _read_scalar_target_candidate(
    component_pair: Any,
    property_tree: Any | None,
    entry: dict[str, Any],
) -> dict[str, Any]:
    property_path = str(entry.get("property_path") or "").strip()
    source = str(entry.get("source") or "")
    use_tree = source.startswith("PropertyTreeEditor")
    attempt: dict[str, Any] = {
        "component_name": entry.get("component_name"),
        "property_path": property_path,
        "property_path_kind": entry.get("property_path_kind"),
        "source": source,
        "discovery_method": source,
        "value_type_hint": entry.get("value_type_hint"),
        "visibility_hint": entry.get("visibility_hint"),
        "get_component_property_attempted": not use_tree,
        "property_tree_get_value_attempted": use_tree,
        "set_component_property_attempted": False,
        "success": False,
        "write_target_admitted": False,
        "write_admission": False,
        "property_list_admission": False,
    }
    if entry.get("readback_candidate") is not True or not property_path:
        attempt.update(
            {
                "readback_skipped": True,
                "evidence_class": entry.get("evidence_class"),
                "reason": entry.get("reason"),
                "get_component_property_attempted": False,
                "property_tree_get_value_attempted": False,
            }
        )
        return attempt

    try:
        if use_tree:
            if property_tree is None:
                attempt["error"] = "PropertyTreeEditor instance unavailable."
                return attempt
            value = property_tree.get_value(property_path)
            readback_api = "PropertyTreeEditor.get_value"
        else:
            property_outcome = editor.EditorComponentAPIBus(
                bus.Broadcast,
                "GetComponentProperty",
                component_pair,
                property_path,
            )
            readback_api = "EditorComponentAPIBus.GetComponentProperty"
            if not property_outcome.IsSuccess():
                try:
                    attempt["error"] = str(property_outcome.GetError())
                except Exception:
                    pass
                return attempt
            value = property_outcome.GetValue()
    except Exception as exc:
        attempt["exception"] = repr(exc)
        return attempt

    serialized_value = _json_safe_value(value)
    value_type = entry.get("value_type_hint")
    if value_type is None:
        value_type = _value_type_from_tree(component_pair, property_path)
    if value_type is None:
        value_type = _fallback_value_type(value)
    value_shape = _scalar_target_value_shape(serialized_value)
    scalar_or_text_like = _scalar_target_value_is_scalar_or_text_like(
        serialized_value,
        value_type,
    )
    attempt.update(
        {
            "success": True,
            "readback_api": readback_api,
            "value": serialized_value,
            "value_type": value_type,
            "runtime_value_type": _fallback_value_type(value),
            "runtime_value_shape": value_shape,
            "value_preview": None if serialized_value is None else str(serialized_value)[:160],
            "scalar_or_text_like": scalar_or_text_like,
            "target_status": "readback_only_candidate",
        }
    )
    return attempt


def _scalar_target_rank(attempt: dict[str, Any]) -> tuple[int, int, str]:
    value_type = str(attempt.get("value_type") or attempt.get("value_type_hint") or "").lower()
    source = str(attempt.get("source") or "")
    path = str(attempt.get("property_path") or "")
    if "string" in value_type or value_type == "str":
        type_rank = 0
    elif "bool" in value_type:
        type_rank = 1
    elif any(marker in value_type for marker in ("int", "float", "double", "number", "u32", "s32")):
        type_rank = 2
    else:
        type_rank = 3
    source_rank = 0 if "with_types" in source else 1 if source == "BuildComponentPropertyList" else 2
    return (type_rank, source_rank, path.lower())


def _run_scalar_target_discovery_ladder(
    command: dict[str, Any],
    component_pair: Any,
    property_paths: list[Any] | None,
    property_list_evidence: dict[str, Any],
) -> dict[str, Any]:
    component_family = str(
        command.get("args", {}).get("proof_component_family") or "unknown"
    )
    property_tree, tree_evidence = _build_scalar_property_tree_evidence(component_pair)
    entries = _normalize_scalar_target_entries(
        property_paths,
        tree_evidence,
        component_family=component_family,
    )
    readback_attempts = [
        _read_scalar_target_candidate(component_pair, property_tree, entry)
        for entry in entries
        if entry.get("readback_candidate") is True
    ]
    selected = next(
        (
            attempt
            for attempt in sorted(readback_attempts, key=_scalar_target_rank)
            if attempt.get("success") is True
            and attempt.get("scalar_or_text_like") is True
            and str(attempt.get("property_path") or "").strip()
            and attempt.get("runtime_value_shape") == "scalar"
        ),
        None,
    )
    root_entries = [
        entry
        for entry in entries
        if entry.get("property_path_kind") == "property_tree_root"
    ]
    any_paths = any(str(entry.get("property_path") or "").strip() for entry in entries)
    if selected is not None:
        status = "candidate_selected_readback_only"
        blocker_code = None
    elif component_family == "Comment" and root_entries:
        status = "blocked"
        blocker_code = "comment_root_string_readback_failed"
    elif any_paths:
        status = "blocked"
        blocker_code = f"{component_family.lower()}_scalar_candidate_not_found"
    elif (
        property_list_evidence.get("success") is not True
        and tree_evidence.get("tree_success") is not True
    ):
        status = "blocked"
        blocker_code = "component_property_paths_unavailable"
    else:
        status = "blocked"
        blocker_code = "scalar_candidate_not_found"

    return {
        "component_family": component_family,
        "status": status,
        "blocker_code": blocker_code,
        "build_component_property_list": property_list_evidence,
        "build_component_property_tree_editor": tree_evidence,
        "normalized_entries": entries,
        "readback_attempts": readback_attempts,
        "selected_candidate": selected,
        "target_selected": selected is not None,
        "future_write_candidate_selected": selected is not None,
        "write_target_admitted": False,
        "write_admission": False,
        "property_list_admission": False,
        "set_component_property_attempted": False,
    }


def _candidate_level_prefab(requested_level_file: Path) -> Path | None:
    if requested_level_file.is_dir():
        prefab_path = requested_level_file / f"{requested_level_file.name}.prefab"
        return prefab_path if prefab_path.is_file() else None
    if requested_level_file.suffix.lower() == ".prefab":
        return requested_level_file
    return requested_level_file if requested_level_file.is_file() else None


def _matching_level_targets(requested_level_file: Path) -> set[str]:
    targets = {_normalize_level_path(requested_level_file)}
    prefab_target = _candidate_level_prefab(requested_level_file)
    if prefab_target is not None:
        targets.add(_normalize_level_path(prefab_target))
        targets.add(_normalize_level_path(prefab_target.parent))
    if requested_level_file.is_file():
        targets.add(_normalize_level_path(requested_level_file.parent))
    return targets


def _wait_for_level_path(
    requested_level_file: Path,
    *,
    timeout_s: float = 5.0,
    poll_interval_s: float = 0.25,
) -> str | None:
    deadline = datetime.now(timezone.utc).timestamp() + timeout_s
    requested_targets = _matching_level_targets(requested_level_file)
    while datetime.now(timezone.utc).timestamp() < deadline:
        current_level = _current_level_path()
        if current_level and _normalize_level_path(current_level) in requested_targets:
            return current_level
        _idle_wait(poll_interval_s)
    return None


def _invoke_bridge_request(operation: str, *args: Any) -> dict[str, Any] | None:
    if not _bridge_request_available():
        return None
    try:
        raw_result = control_plane_editor_bridge.ControlPlaneEditorBridgeRequestBus(  # type: ignore[union-attr]
            bus.Broadcast,
            operation,
            *args,
        )
    except Exception as exc:
        return {
            "success": False,
            "operation": operation,
            "result_summary": f"Bridge request '{operation}' raised an editor-side exception.",
            "error_code": "BRIDGE_REQUEST_EXCEPTION",
            "details": {"exception": repr(exc)},
        }
    try:
        payload = json.loads(raw_result)
    except Exception as exc:
        return {
            "success": False,
            "operation": operation,
            "result_summary": f"Bridge request '{operation}' returned invalid JSON.",
            "error_code": "BRIDGE_RESULT_INVALID_JSON",
            "details": {
                "raw_result": raw_result,
                "exception": repr(exc),
            },
        }
    if not isinstance(payload, dict):
        return {
            "success": False,
            "operation": operation,
            "result_summary": f"Bridge request '{operation}' returned a non-object payload.",
            "error_code": "BRIDGE_RESULT_INVALID_SHAPE",
            "details": {"raw_result": raw_result},
        }
    payload_details = payload.get("details")
    if not isinstance(payload_details, dict):
        payload["details"] = {}
    return payload


def _ensure_level_open(command: dict[str, Any], runtime_state: dict[str, Any]) -> dict[str, Any]:
    started_at = utc_now()
    if not _editor_available():
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Editor Python bindings are not available inside the bridge host.",
            details=_base_details(runtime_state),
            error_code="EDITOR_BINDINGS_UNAVAILABLE",
        )

    requested_level = command.get("args", {}).get("level_path")
    if not isinstance(requested_level, str) or not requested_level:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.level.open requires args.level_path.",
            details=_base_details(runtime_state),
            error_code="LEVEL_PATH_MISSING",
        )

    project_root = _project_root_from_state(runtime_state)
    requested_level_file = _resolve_requested_level(project_root, requested_level)
    current_level = _current_level_path()
    if current_level and _normalize_level_path(current_level) in _matching_level_targets(requested_level_file):
        details = _base_details(runtime_state)
        details["ensure_result"] = "already_open"
        details["level_path"] = current_level
        return _response(
            command=command,
            started_at=started_at,
            success=True,
            status="ok",
            result_summary="Requested level is already open in the persistent bridge session.",
            details=details,
        )

    try:
        open_argument = None
        if requested_level_file.exists():
            prefab_target = _candidate_level_prefab(requested_level_file)
            open_target = prefab_target if prefab_target is not None else requested_level_file
            open_argument = str(open_target)
            general.open_level_no_prompt(open_argument)
            ensure_result = "opened_existing"
        else:
            general.create_level_no_prompt(Path(requested_level).stem, 1024, 1, False)
            ensure_result = "created"
        observed_level_path = _wait_for_level_path(requested_level_file)
        details = _base_details(runtime_state)
        details["ensure_result"] = ensure_result
        details["requested_level_path"] = str(requested_level_file)
        details["requested_level_open_argument"] = open_argument
        details["requested_level_targets"] = sorted(_matching_level_targets(requested_level_file))
        if not observed_level_path:
            active_level_path = details.get("active_level_path")
            if (
                isinstance(active_level_path, str)
                and active_level_path
                and _normalize_level_path(active_level_path)
                in _matching_level_targets(requested_level_file)
            ):
                observed_level_path = active_level_path
                details["level_observation_source"] = "post_wait_context_snapshot"
            else:
                details["level_observation_source"] = "not_observed"
        else:
            details["level_observation_source"] = "wait_loop"
        details["level_path"] = observed_level_path
        if not observed_level_path:
            return _response(
                command=command,
                started_at=started_at,
                success=False,
                status="failed",
                result_summary="Persistent bridge did not observe the requested level as active after the open/create call.",
                details=details,
                error_code="LEVEL_CONTEXT_NOT_OBSERVED",
            )
        return _response(
            command=command,
            started_at=started_at,
            success=True,
            status="ok",
            result_summary="Requested level is available in the persistent bridge session.",
            details=details,
        )
    except Exception as exc:
        details = _base_details(runtime_state)
        details["requested_level_path"] = str(requested_level_file)
        details["exception"] = repr(exc)
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Persistent bridge failed to open or create the requested level.",
            details=details,
            error_code="LEVEL_OPEN_FAILED",
        )


def _entity_create_probe(command: dict[str, Any], runtime_state: dict[str, Any]) -> dict[str, Any]:
    started_at = utc_now()
    details = _base_details(runtime_state)
    details["contract_attempted"] = "ToolsApplicationRequestBus.CreateNewEntity(EntityId())"
    details["prefab_context_notes"] = (
        "Diagnostic-only probe. A valid entity id must be proven before editor.entity.create can be restored."
    )
    if not _editor_available():
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Editor Python bindings are not available inside the bridge host.",
            details=details,
            error_code="EDITOR_BINDINGS_UNAVAILABLE",
        )
    if not details.get("level_loaded"):
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Entity creation probe requires an open level context.",
            details=details,
            error_code="ENTITY_CREATE_LEVEL_CONTEXT_MISSING",
        )
    try:
        editor.ToolsApplicationRequestBus(bus.Broadcast, "SetSelectedEntities", [])
        _idle_wait(0.1)
        created_entity = editor.ToolsApplicationRequestBus(
            bus.Broadcast,
            "CreateNewEntity",
            EntityId(),
        )
        entity_id = created_entity.ToString() if created_entity and created_entity.IsValid() else None
        details["returned_entity_id"] = entity_id
        if not entity_id:
            return _response(
                command=command,
                started_at=started_at,
                success=False,
                status="failed",
                result_summary="Entity creation probe did not receive a valid entity id on this target.",
                details=details,
                error_code="ENTITY_CREATE_FAILED",
            )
        requested_name = command.get("args", {}).get("entity_name")
        details["name_mutation_ran"] = False
        if isinstance(requested_name, str) and requested_name:
            try:
                editor.EditorEntityAPIBus(bus.Event, "SetName", created_entity, requested_name)
                details["name_mutation_ran"] = True
                details["name_mutation_succeeded"] = True
            except Exception:
                details["name_mutation_ran"] = True
                details["name_mutation_succeeded"] = False
        return _response(
            command=command,
            started_at=started_at,
            success=True,
            status="ok",
            result_summary="Entity creation probe returned a valid entity id.",
            details=details,
        )
    except Exception as exc:
        details["exception"] = repr(exc)
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Entity creation probe hit an editor-side compatibility failure.",
            details=details,
            error_code="ENTITY_CREATE_PROBE_FAILED",
        )


def _create_root_entity(command: dict[str, Any], runtime_state: dict[str, Any]) -> dict[str, Any]:
    started_at = utc_now()
    if not _editor_available():
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Editor Python bindings are not available inside the bridge host.",
            details=_base_details(runtime_state),
            error_code="EDITOR_BINDINGS_UNAVAILABLE",
        )

    entity_name = command.get("args", {}).get("entity_name")
    if not isinstance(entity_name, str) or not entity_name:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.entity.create requires args.entity_name.",
            details=_base_details(runtime_state),
            error_code="ENTITY_NAME_MISSING",
        )

    requested_level = command.get("args", {}).get("level_path")
    if not isinstance(requested_level, str) or not requested_level:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.entity.create requires args.level_path.",
            details=_base_details(runtime_state),
            error_code="LEVEL_PATH_MISSING",
        )

    bridge_payload = _invoke_bridge_request(
        "CreateRootEntity",
        requested_level,
        entity_name,
    )
    if bridge_payload is None:
        details = _base_details(runtime_state)
        details["bridge_module_loaded"] = False
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="The bridge request bus is not available inside the editor host.",
            details=details,
            error_code="BRIDGE_MODULE_UNAVAILABLE",
        )

    details = _merge_bridge_details(runtime_state, bridge_payload)
    if bridge_payload.get("success") is not True:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary=str(
                bridge_payload.get(
                    "result_summary",
                    "Bridge-backed root entity creation failed.",
                )
            ),
            details=details,
            error_code=str(bridge_payload.get("error_code") or "ENTITY_CREATE_FAILED"),
        )

    details["post_create_name_search"] = entity_name
    bridge_entity_id = details.get("entity_id")
    details["direct_return_entity_id"] = bridge_entity_id
    expected_entity_id = _normalize_entity_id_text(bridge_entity_id)
    search_deadline = datetime.now(timezone.utc).timestamp() + 5.0
    search_attempts = 0
    search_exception = None
    last_candidate_preview: list[dict[str, Any]] = []
    last_search_count = 0
    matching_candidate = None

    while datetime.now(timezone.utc).timestamp() < search_deadline:
        search_attempts += 1
        search_filter = entity.SearchFilter()
        search_filter.names = [entity_name]
        search_filter.names_case_sensitive = True
        try:
            search_results = entity.SearchBus(bus.Broadcast, "SearchEntities", search_filter)
        except Exception as exc:
            search_exception = repr(exc)
            break

        if isinstance(search_results, list):
            search_candidates = search_results
        elif search_results is None:
            search_candidates = []
        else:
            try:
                search_candidates = list(search_results)
            except TypeError:
                search_candidates = []

        last_search_count = len(search_candidates)
        valid_candidates: list[EntityId] = []
        candidate_preview: list[dict[str, Any]] = []
        matching_candidate = None
        for candidate_entity_id in search_candidates:
            if not _is_entity_id_like(candidate_entity_id) or not candidate_entity_id.IsValid():
                continue
            candidate_text = candidate_entity_id.ToString()
            candidate_name = _entity_name(candidate_entity_id)
            candidate_preview.append(
                {
                    "entity_id": candidate_text,
                    "entity_name": candidate_name,
                }
            )
            try:
                candidate_exists = editor.ToolsApplicationRequestBus(
                    bus.Broadcast,
                    "EntityExists",
                    candidate_entity_id,
                )
            except Exception:
                candidate_exists = False
            if not candidate_exists:
                continue
            valid_candidates.append(candidate_entity_id)
            if expected_entity_id is not None and _normalize_entity_id_text(candidate_text) == expected_entity_id:
                matching_candidate = candidate_entity_id
                break

        last_candidate_preview = candidate_preview[:10]
        if matching_candidate is None and len(valid_candidates) == 1:
            matching_candidate = valid_candidates[0]
            details["post_create_resolution_path"] = "exact-name-single-candidate"
            break
        if matching_candidate is not None:
            details["post_create_resolution_path"] = "exact-name-id-match"
            break
        _idle_wait(0.25)

    details["post_create_name_search_attempts"] = search_attempts
    details["post_create_name_search_count"] = last_search_count
    details["post_create_name_search_candidates"] = last_candidate_preview
    if search_exception is not None:
        details["post_create_name_search_exception"] = search_exception
    if matching_candidate is None and "post_create_resolution_path" not in details:
        details["post_create_resolution_path"] = "exact-name-unresolved"

    if matching_candidate is not None:
        details["resolved_entity_id"] = matching_candidate.ToString()
        details["entity_id_cache_keys"] = _remember_entity_id(
            matching_candidate,
            bridge_entity_id,
            entity_name,
        )
        details["entity_id_cache_populated"] = True
        resolved_normalized = _normalize_entity_id_text(matching_candidate)
        details["post_create_id_mismatch"] = (
            expected_entity_id is not None and resolved_normalized != expected_entity_id
        )
    else:
        details["entity_id_cache_populated"] = False

    return _response(
        command=command,
        started_at=started_at,
        success=True,
        status="ok",
        result_summary=str(
            bridge_payload.get(
                "result_summary",
                "Root entity creation succeeded through the persistent bridge session.",
            )
        ),
        details=details,
    )


def _add_components_to_entity(command: dict[str, Any], runtime_state: dict[str, Any]) -> dict[str, Any]:
    started_at = utc_now()
    details = _base_details(runtime_state)
    details["prefab_context_notes"] = (
        "Explicit existing-entity component attachment through the editor component API; "
        "property mutation, removal, parenting, prefab work, and transform placement remain out of scope."
    )
    details["allowlisted_components"] = list(COMPONENT_ADD_ALLOWLIST)
    if not _editor_available():
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Editor Python bindings are not available inside the bridge host.",
            details=details,
            error_code="EDITOR_BINDINGS_UNAVAILABLE",
        )

    requested_level = command.get("args", {}).get("level_path")
    if not isinstance(requested_level, str) or not requested_level:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.add requires args.level_path.",
            details=details,
            error_code="LEVEL_PATH_MISSING",
        )

    active_level_path = details.get("active_level_path")
    if not isinstance(active_level_path, str) or not active_level_path:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.add requires an open loaded level context.",
            details=details,
            error_code="COMPONENT_ADD_LEVEL_CONTEXT_MISSING",
        )
    details["loaded_level_path"] = active_level_path
    details["level_path"] = active_level_path
    details["requested_level_path"] = requested_level
    if _normalize_level_path(requested_level) != _normalize_level_path(active_level_path):
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.add level_path must match the currently loaded level.",
            details=details,
            error_code="LOADED_LEVEL_MISMATCH",
        )

    requested_entity_id = command.get("args", {}).get("entity_id")
    entity_name_hint = command.get("args", {}).get("entity_name_hint")
    if isinstance(entity_name_hint, str) and entity_name_hint:
        details["entity_name_hint"] = entity_name_hint
    else:
        entity_name_hint = None
    entity_id, entity_resolution_details = _coerce_entity_id(
        requested_entity_id,
        entity_name_hint=entity_name_hint,
    )
    details.update(entity_resolution_details)
    if entity_id is None:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.add requires a valid explicit entity id.",
            details=details,
            error_code="ENTITY_ID_INVALID",
        )

    entity_id_string = entity_id.ToString()
    details["entity_id"] = entity_id_string
    details["resolved_entity_id"] = entity_id_string
    entity_exists = editor.ToolsApplicationRequestBus(bus.Broadcast, "EntityExists", entity_id)
    details["entity_exists"] = bool(entity_exists)
    if not entity_exists:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.add could not resolve the requested entity in the loaded level.",
            details=details,
            error_code="ENTITY_NOT_FOUND",
        )

    entity_name = _entity_name(entity_id)
    if isinstance(entity_name, str) and entity_name:
        details["entity_name"] = entity_name

    canonical_components, unsupported_components, duplicate_components = (
        _canonicalize_component_names(command.get("args", {}).get("components"))
    )
    details["requested_components"] = command.get("args", {}).get("components")
    if not canonical_components and not unsupported_components and not duplicate_components:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.add requires at least one allowlisted component.",
            details=details,
            error_code="COMPONENTS_MISSING",
        )
    if unsupported_components:
        details["unsupported_components"] = unsupported_components
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.add received a component outside the allowlisted surface.",
            details=details,
            error_code="UNSUPPORTED_COMPONENTS",
        )
    if duplicate_components:
        details["duplicate_components"] = duplicate_components
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.add requires each requested component to appear at most once.",
            details=details,
            error_code="DUPLICATE_COMPONENT_REQUEST",
        )

    added_components: list[str] = []
    added_component_refs: list[dict[str, Any]] = []
    rejected_components: list[dict[str, Any]] = []
    for component_name in canonical_components:
        component_type_id = _resolve_component_type_id(component_name)
        if component_type_id is None:
            details["failed_component"] = component_name
            return _response(
                command=command,
                started_at=started_at,
                success=False,
                status="failed",
                result_summary="editor.component.add could not resolve an allowlisted component type on this target.",
                details=details,
                error_code="COMPONENT_TYPE_UNRESOLVED",
            )

        has_component = editor.EditorComponentAPIBus(
            bus.Broadcast,
            "HasComponentOfType",
            entity_id,
            component_type_id,
        )
        if has_component:
            rejected_components.append(
                {"component": component_name, "reason": "already_present"}
            )
            continue

        add_outcome = editor.EditorComponentAPIBus(
            bus.Broadcast,
            "AddComponentsOfType",
            entity_id,
            [component_type_id],
        )
        if not add_outcome.IsSuccess():
            rejected_entry: dict[str, Any] = {
                "component": component_name,
                "reason": "add_failed",
            }
            try:
                rejected_entry["error"] = str(add_outcome.GetError())
            except Exception:
                pass
            rejected_components.append(rejected_entry)
            continue

        added_components.append(component_name)
        component_pairs = add_outcome.GetValue()
        component_pair = None
        if isinstance(component_pairs, list) and component_pairs:
            component_pair = component_pairs[0]
        get_component_outcome = editor.EditorComponentAPIBus(
            bus.Broadcast,
            "GetComponentOfType",
            entity_id,
            component_type_id,
        )
        if get_component_outcome.IsSuccess():
            resolved_component_pair = get_component_outcome.GetValue()
            if _is_component_pair_like(resolved_component_pair):
                component_pair = resolved_component_pair
        component_ref: dict[str, Any] = {"component": component_name}
        component_pair_text = _stringify_component_id_value(component_pair)
        if component_pair_text:
            component_ref["component_pair_text"] = component_pair_text
        component_id_text = None
        component_numeric_id = _component_pair_component_id(component_pair)
        normalized_target_entity_text = _normalize_entity_id_text(entity_id_string)
        if component_numeric_id is not None and normalized_target_entity_text is not None:
            component_id_text = (
                f"EntityComponentIdPair(EntityId({normalized_target_entity_text}), "
                f"{component_numeric_id})"
            )
            component_ref["component_numeric_id"] = component_numeric_id
        if component_id_text is None:
            component_id_text = _component_pair_to_string(component_pair)
        if component_id_text is not None:
            component_ref["component_id"] = component_id_text
        component_pair_cache_keys = _remember_component_pair(
            component_pair,
            component_pair_text,
            component_id_text,
        )
        if component_pair_cache_keys:
            component_ref["component_pair_cache_keys"] = component_pair_cache_keys
        component_id_getter = getattr(component_pair, "get_component_id", None)
        if callable(component_id_getter):
            try:
                raw_component_id_value = component_id_getter()
            except Exception:
                raw_component_id_value = None
            raw_component_id_text = _stringify_component_id_value(raw_component_id_value)
            if raw_component_id_text:
                component_ref["raw_component_id_text"] = raw_component_id_text
        if entity_id_string:
            component_ref["entity_id"] = entity_id_string
        added_component_refs.append(component_ref)

    modified_entities = [entity_id_string] if added_components else []
    details["added_components"] = added_components
    details["added_component_refs"] = added_component_refs
    details["rejected_components"] = rejected_components
    details["modified_entities"] = modified_entities

    if added_components and rejected_components:
        result_summary = (
            f"Added {len(added_components)} component(s) to entity '{entity_id_string}' "
            f"and rejected {len(rejected_components)} already-present or failed component request(s)."
        )
    elif added_components:
        result_summary = (
            f"Added {len(added_components)} component(s) to entity '{entity_id_string}' "
            "through the persistent bridge session."
        )
    elif rejected_components:
        result_summary = (
            f"No new components were added to entity '{entity_id_string}'; all requested "
            "components were already present or failed to attach."
        )
    else:
        result_summary = (
            f"No component changes were applied to entity '{entity_id_string}'."
        )

    return _response(
        command=command,
        started_at=started_at,
        success=True,
        status="ok",
        result_summary=result_summary,
        details=details,
    )


def _entity_exists(command: dict[str, Any], runtime_state: dict[str, Any]) -> dict[str, Any]:
    started_at = utc_now()
    details = _base_details(runtime_state)
    details["prefab_context_notes"] = (
        "Explicit entity existence readback only; delete, reload, parenting, "
        "prefab, property mutation, and broad scene enumeration remain out of scope."
    )
    if not _editor_available():
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Editor Python bindings are not available inside the bridge host.",
            details=details,
            error_code="EDITOR_BINDINGS_UNAVAILABLE",
        )

    active_level_path = details.get("active_level_path")
    if not isinstance(active_level_path, str) or not active_level_path:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.entity.exists requires an open loaded level context.",
            details=details,
            error_code="ENTITY_EXISTS_LEVEL_CONTEXT_MISSING",
        )

    details["loaded_level_path"] = active_level_path
    details["level_path"] = active_level_path
    requested_level = command.get("args", {}).get("level_path")
    if isinstance(requested_level, str) and requested_level:
        details["requested_level_path"] = requested_level
        if _normalize_level_path(requested_level) != _normalize_level_path(active_level_path):
            return _response(
                command=command,
                started_at=started_at,
                success=False,
                status="failed",
                result_summary="editor.entity.exists level_path must match the currently loaded level.",
                details=details,
                error_code="LOADED_LEVEL_MISMATCH",
            )

    args = command.get("args", {})
    requested_entity_id = args.get("entity_id")
    requested_entity_name = args.get("entity_name")
    has_entity_id = requested_entity_id is not None and not (
        isinstance(requested_entity_id, str) and not requested_entity_id.strip()
    )
    has_entity_name = isinstance(requested_entity_name, str) and bool(
        requested_entity_name.strip()
    )
    if has_entity_id == has_entity_name:
        details["requested_entity_id"] = requested_entity_id
        details["requested_entity_name"] = requested_entity_name
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.entity.exists requires exactly one explicit entity_id or entity_name.",
            details=details,
            error_code="ENTITY_LOOKUP_TARGET_INVALID",
        )

    if has_entity_id:
        details["lookup_mode"] = "entity_id"
        details["requested_entity_id"] = requested_entity_id
        normalized_entity_id = _normalize_entity_id_text(requested_entity_id)
        details["requested_entity_id_normalized"] = normalized_entity_id
        if normalized_entity_id is None:
            return _response(
                command=command,
                started_at=started_at,
                success=False,
                status="failed",
                result_summary="editor.entity.exists requires a valid explicit entity_id.",
                details=details,
                error_code="ENTITY_ID_INVALID",
            )

        try:
            candidate_entity_id = EntityId(int(normalized_entity_id))
        except Exception as exc:
            details["entity_id_constructor_exception"] = repr(exc)
            return _response(
                command=command,
                started_at=started_at,
                success=False,
                status="failed",
                result_summary="editor.entity.exists could not construct the requested entity id.",
                details=details,
                error_code="ENTITY_ID_INVALID",
            )

        details["entity_id"] = candidate_entity_id.ToString()
        if not candidate_entity_id or not candidate_entity_id.IsValid():
            details["exists"] = False
            details["matched_count"] = 0
            return _response(
                command=command,
                started_at=started_at,
                success=True,
                status="ok",
                result_summary="The requested explicit entity id is not valid in the loaded level.",
                details=details,
            )

        try:
            entity_exists = editor.ToolsApplicationRequestBus(
                bus.Broadcast,
                "EntityExists",
                candidate_entity_id,
            )
        except Exception as exc:
            details["entity_exists_exception"] = repr(exc)
            return _response(
                command=command,
                started_at=started_at,
                success=False,
                status="failed",
                result_summary="editor.entity.exists raised an editor-side exception.",
                details=details,
                error_code="ENTITY_EXISTS_QUERY_FAILED",
            )

        details["exists"] = bool(entity_exists)
        details["matched_count"] = 1 if entity_exists else 0
        if entity_exists:
            details["entity_name"] = _entity_name(candidate_entity_id)
            details["entity_id_cache_keys"] = _remember_entity_id(
                candidate_entity_id,
                requested_entity_id,
            )
        return _response(
            command=command,
            started_at=started_at,
            success=True,
            status="ok",
            result_summary=(
                "The requested explicit entity id exists in the loaded level."
                if entity_exists
                else "The requested explicit entity id was not found in the loaded level."
            ),
            details=details,
        )

    entity_name = requested_entity_name.strip()
    details["lookup_mode"] = "entity_name"
    details["requested_entity_name"] = entity_name
    search_filter = entity.SearchFilter()
    search_filter.names = [entity_name]
    search_filter.names_case_sensitive = True
    try:
        search_results = entity.SearchBus(bus.Broadcast, "SearchEntities", search_filter)
    except Exception as exc:
        details["entity_name_search_exception"] = repr(exc)
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.entity.exists exact-name lookup raised an editor-side exception.",
            details=details,
            error_code="ENTITY_NAME_LOOKUP_FAILED",
        )

    if isinstance(search_results, list):
        search_candidates = search_results
    elif search_results is None:
        search_candidates = []
    else:
        try:
            search_candidates = list(search_results)
        except TypeError:
            search_candidates = []

    details["entity_name_search_count"] = len(search_candidates)
    candidate_preview: list[dict[str, Any]] = []
    matching_candidates: list[EntityId] = []
    for candidate_entity_id in search_candidates:
        if not _is_entity_id_like(candidate_entity_id) or not candidate_entity_id.IsValid():
            continue
        candidate_text = candidate_entity_id.ToString()
        candidate_name = _entity_name(candidate_entity_id)
        if len(candidate_preview) < 10:
            candidate_preview.append(
                {
                    "entity_id": candidate_text,
                    "entity_name": candidate_name,
                }
            )
        try:
            candidate_exists = editor.ToolsApplicationRequestBus(
                bus.Broadcast,
                "EntityExists",
                candidate_entity_id,
            )
        except Exception:
            candidate_exists = False
        if candidate_exists and candidate_name == entity_name:
            matching_candidates.append(candidate_entity_id)

    details["entity_name_search_candidates"] = candidate_preview
    details["matched_count"] = len(matching_candidates)
    details["matched_entity_ids"] = [
        candidate_entity_id.ToString() for candidate_entity_id in matching_candidates
    ]
    if not matching_candidates:
        details["exists"] = False
        return _response(
            command=command,
            started_at=started_at,
            success=True,
            status="ok",
            result_summary="The requested exact entity name was not found in the loaded level.",
            details=details,
        )
    if len(matching_candidates) > 1:
        details["exists"] = True
        details["ambiguous"] = True
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.entity.exists exact-name lookup matched multiple live entities.",
            details=details,
            error_code="ENTITY_NAME_AMBIGUOUS",
        )

    matched_entity_id = matching_candidates[0]
    details["exists"] = True
    details["ambiguous"] = False
    details["entity_id"] = matched_entity_id.ToString()
    details["entity_name"] = _entity_name(matched_entity_id)
    details["entity_id_cache_keys"] = _remember_entity_id(
        matched_entity_id,
        entity_name,
    )
    return _response(
        command=command,
        started_at=started_at,
        success=True,
        status="ok",
        result_summary="The requested exact entity name exists in the loaded level.",
        details=details,
    )


def _find_component(command: dict[str, Any], runtime_state: dict[str, Any]) -> dict[str, Any]:
    started_at = utc_now()
    details = _base_details(runtime_state)
    details["prefab_context_notes"] = (
        "Explicit live component target discovery only for one entity and one "
        "allowlisted component type; prefab-derived component ids, property listing, "
        "property values, property mutation, and broad scene/component enumeration remain out of scope."
    )
    details["allowlisted_components"] = list(COMPONENT_ADD_ALLOWLIST)
    if not _editor_available():
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Editor Python bindings are not available inside the bridge host.",
            details=details,
            error_code="EDITOR_BINDINGS_UNAVAILABLE",
        )

    active_level_path = details.get("active_level_path")
    if not isinstance(active_level_path, str) or not active_level_path:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.find requires an open loaded level context.",
            details=details,
            error_code="COMPONENT_FIND_LEVEL_CONTEXT_MISSING",
        )

    details["loaded_level_path"] = active_level_path
    details["level_path"] = active_level_path
    requested_level = command.get("args", {}).get("level_path")
    if isinstance(requested_level, str) and requested_level:
        details["requested_level_path"] = requested_level
        if _normalize_level_path(requested_level) != _normalize_level_path(active_level_path):
            return _response(
                command=command,
                started_at=started_at,
                success=False,
                status="failed",
                result_summary="editor.component.find level_path must match the currently loaded level.",
                details=details,
                error_code="LOADED_LEVEL_MISMATCH",
            )

    args = command.get("args", {})
    requested_entity_id = args.get("entity_id")
    requested_entity_name = args.get("entity_name")
    has_entity_id = requested_entity_id is not None and not (
        isinstance(requested_entity_id, str) and not requested_entity_id.strip()
    )
    has_entity_name = isinstance(requested_entity_name, str) and bool(
        requested_entity_name.strip()
    )
    if has_entity_id == has_entity_name:
        details["requested_entity_id"] = requested_entity_id
        details["requested_entity_name"] = requested_entity_name
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.find requires exactly one explicit entity_id or exact entity_name.",
            details=details,
            error_code="COMPONENT_FIND_ENTITY_TARGET_INVALID",
        )

    raw_component_name = args.get("component_name")
    details["requested_component_name"] = raw_component_name
    canonical_components, unsupported_components, duplicate_components = (
        _canonicalize_component_names([raw_component_name])
    )
    if unsupported_components or duplicate_components or not canonical_components:
        if unsupported_components:
            details["unsupported_components"] = unsupported_components
        if duplicate_components:
            details["duplicate_components"] = duplicate_components
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.find requires exactly one allowlisted component_name.",
            details=details,
            error_code="COMPONENT_FIND_COMPONENT_UNSUPPORTED",
        )
    component_name = canonical_components[0]
    details["component_name"] = component_name
    details["requested_component_name"] = component_name

    if has_entity_id:
        details["lookup_mode"] = "entity_id"
        entity_id, entity_resolution_details = _coerce_entity_id(requested_entity_id)
        details.update(entity_resolution_details)
        if entity_id is None:
            return _response(
                command=command,
                started_at=started_at,
                success=False,
                status="failed",
                result_summary="editor.component.find requires a valid explicit entity_id.",
                details=details,
                error_code="ENTITY_ID_INVALID",
            )
    else:
        entity_name = requested_entity_name.strip()
        details["lookup_mode"] = "entity_name"
        details["requested_entity_name"] = entity_name
        search_filter = entity.SearchFilter()
        search_filter.names = [entity_name]
        search_filter.names_case_sensitive = True
        try:
            search_results = entity.SearchBus(bus.Broadcast, "SearchEntities", search_filter)
        except Exception as exc:
            details["entity_name_search_exception"] = repr(exc)
            return _response(
                command=command,
                started_at=started_at,
                success=False,
                status="failed",
                result_summary="editor.component.find exact-name lookup raised an editor-side exception.",
                details=details,
                error_code="ENTITY_NAME_LOOKUP_FAILED",
            )
        if isinstance(search_results, list):
            search_candidates = search_results
        elif search_results is None:
            search_candidates = []
        else:
            try:
                search_candidates = list(search_results)
            except TypeError:
                search_candidates = []

        matching_candidates: list[EntityId] = []
        candidate_preview: list[dict[str, Any]] = []
        for candidate_entity_id in search_candidates:
            if not _is_entity_id_like(candidate_entity_id) or not candidate_entity_id.IsValid():
                continue
            candidate_name = _entity_name(candidate_entity_id)
            if len(candidate_preview) < 10:
                candidate_preview.append(
                    {
                        "entity_id": candidate_entity_id.ToString(),
                        "entity_name": candidate_name,
                    }
                )
            try:
                candidate_exists = editor.ToolsApplicationRequestBus(
                    bus.Broadcast,
                    "EntityExists",
                    candidate_entity_id,
                )
            except Exception:
                candidate_exists = False
            if candidate_exists and candidate_name == entity_name:
                matching_candidates.append(candidate_entity_id)
        details["entity_name_search_candidates"] = candidate_preview
        details["matched_entity_ids"] = [
            candidate_entity_id.ToString() for candidate_entity_id in matching_candidates
        ]
        if not matching_candidates:
            details["found"] = False
            details["matched_count"] = 0
            details["component_refs"] = []
            return _response(
                command=command,
                started_at=started_at,
                success=True,
                status="ok",
                result_summary="The requested exact entity name was not found in the loaded level.",
                details=details,
            )
        if len(matching_candidates) > 1:
            details["ambiguous"] = True
            details["matched_count"] = len(matching_candidates)
            return _response(
                command=command,
                started_at=started_at,
                success=False,
                status="failed",
                result_summary="editor.component.find exact-name lookup matched multiple live entities.",
                details=details,
                error_code="ENTITY_NAME_AMBIGUOUS",
            )
        entity_id = matching_candidates[0]

    entity_id_string = entity_id.ToString()
    details["entity_id"] = entity_id_string
    details["resolved_entity_id"] = entity_id_string
    entity_name = _entity_name(entity_id)
    if isinstance(entity_name, str) and entity_name:
        details["entity_name"] = entity_name
    details["entity_id_cache_keys"] = _remember_entity_id(
        entity_id,
        requested_entity_id,
        requested_entity_name,
    )

    try:
        entity_exists = editor.ToolsApplicationRequestBus(
            bus.Broadcast,
            "EntityExists",
            entity_id,
        )
    except Exception as exc:
        details["entity_exists_exception"] = repr(exc)
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.find raised an editor-side entity lookup exception.",
            details=details,
            error_code="ENTITY_EXISTS_QUERY_FAILED",
        )
    if not entity_exists:
        details["found"] = False
        details["matched_count"] = 0
        details["component_refs"] = []
        return _response(
            command=command,
            started_at=started_at,
            success=True,
            status="ok",
            result_summary="The requested entity was not found in the loaded level.",
            details=details,
        )

    component_type_id = _resolve_component_type_id(component_name)
    if component_type_id is None:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.find could not resolve an allowlisted component type on this target.",
            details=details,
            error_code="COMPONENT_TYPE_UNRESOLVED",
        )

    try:
        has_component = editor.EditorComponentAPIBus(
            bus.Broadcast,
            "HasComponentOfType",
            entity_id,
            component_type_id,
        )
    except Exception as exc:
        details["component_has_exception"] = repr(exc)
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.find raised an editor-side component lookup exception.",
            details=details,
            error_code="COMPONENT_FIND_QUERY_FAILED",
        )

    details["found"] = bool(has_component)
    if not has_component:
        details["matched_count"] = 0
        details["component_refs"] = []
        return _response(
            command=command,
            started_at=started_at,
            success=True,
            status="ok",
            result_summary="The requested component was not found on the live entity.",
            details=details,
        )

    try:
        get_component_outcome = editor.EditorComponentAPIBus(
            bus.Broadcast,
            "GetComponentOfType",
            entity_id,
            component_type_id,
        )
    except Exception as exc:
        details["component_get_exception"] = repr(exc)
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.find could not obtain a live component id.",
            details=details,
            error_code="COMPONENT_ID_LOOKUP_FAILED",
        )
    if not get_component_outcome.IsSuccess():
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.find component lookup did not return a live component id.",
            details=details,
            error_code="COMPONENT_ID_LOOKUP_FAILED",
        )

    component_pair = get_component_outcome.GetValue()
    component_ref: dict[str, Any] = {"component": component_name}
    component_pair_text = _stringify_component_id_value(component_pair)
    if component_pair_text:
        component_ref["component_pair_text"] = component_pair_text
    component_id_text = None
    component_numeric_id = _component_pair_component_id(component_pair)
    normalized_entity_text = _normalize_entity_id_text(entity_id_string)
    if component_numeric_id is not None and normalized_entity_text is not None:
        component_id_text = (
            f"EntityComponentIdPair(EntityId({normalized_entity_text}), "
            f"{component_numeric_id})"
        )
        component_ref["component_numeric_id"] = component_numeric_id
    if component_id_text is None:
        component_id_text = _component_pair_to_string(component_pair)
    if component_id_text is not None:
        component_ref["component_id"] = component_id_text
        details["component_id"] = component_id_text
        details["component_id_provenance"] = "admitted_runtime_component_discovery_result"
    component_pair_cache_keys = _remember_component_pair(
        component_pair,
        component_pair_text,
        component_id_text,
    )
    if component_pair_cache_keys:
        component_ref["component_pair_cache_keys"] = component_pair_cache_keys
    if entity_id_string:
        component_ref["entity_id"] = entity_id_string
    if entity_name:
        component_ref["entity_name"] = entity_name
    component_ref["component_id_provenance"] = "admitted_runtime_component_discovery_result"
    component_ref["source_operation"] = "editor.component.find"
    details["component_refs"] = [component_ref]
    details["matched_count"] = 1
    details["ambiguous"] = False

    return _response(
        command=command,
        started_at=started_at,
        success=True,
        status="ok",
        result_summary="The requested live component target was found in the loaded level.",
        details=details,
    )


def _list_component_properties(command: dict[str, Any], runtime_state: dict[str, Any]) -> dict[str, Any]:
    started_at = utc_now()
    details = _base_details(runtime_state)
    details["prefab_context_notes"] = (
        "Explicit existing-component property path listing only through the editor component API; "
        "property value bulk reads, property mutation, container edits, and broad component discovery remain out of scope."
    )
    if not _editor_available():
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Editor Python bindings are not available inside the bridge host.",
            details=details,
            error_code="EDITOR_BINDINGS_UNAVAILABLE",
        )

    active_level_path = details.get("active_level_path")
    if not isinstance(active_level_path, str) or not active_level_path:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.property.list requires an open loaded level context.",
            details=details,
            error_code="COMPONENT_PROPERTY_LIST_LEVEL_CONTEXT_MISSING",
        )

    details["loaded_level_path"] = active_level_path
    details["level_path"] = active_level_path
    requested_level = command.get("args", {}).get("level_path")
    if isinstance(requested_level, str) and requested_level:
        details["requested_level_path"] = requested_level
        if _normalize_level_path(requested_level) != _normalize_level_path(active_level_path):
            return _response(
                command=command,
                started_at=started_at,
                success=False,
                status="failed",
                result_summary="editor.component.property.list level_path must match the currently loaded level.",
                details=details,
                error_code="LOADED_LEVEL_MISMATCH",
            )

    requested_component_id = command.get("args", {}).get("component_id")
    if not isinstance(requested_component_id, str) or not requested_component_id.strip():
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.property.list requires args.component_id.",
            details=details,
            error_code="COMPONENT_ID_MISSING",
        )

    component_pair, component_resolution_details = _coerce_component_pair(
        requested_component_id.strip()
    )
    details.update(component_resolution_details)
    if component_pair is None:
        resolution_path = component_resolution_details.get("component_resolution_path")
        if resolution_path == "entity-not-found":
            result_summary = (
                "editor.component.property.list could not resolve the component's entity "
                "in the loaded level."
            )
            error_code = "COMPONENT_ENTITY_NOT_FOUND"
        elif resolution_path == "component-not-found":
            result_summary = (
                "editor.component.property.list could not resolve the requested explicit "
                "component in the loaded level."
            )
            error_code = "COMPONENT_NOT_FOUND"
        else:
            result_summary = (
                "editor.component.property.list requires a valid explicit component id."
            )
            error_code = "COMPONENT_ID_INVALID"
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary=result_summary,
            details=details,
            error_code=error_code,
        )

    component_id_text = _component_pair_to_string(component_pair)
    if component_id_text is not None:
        details["component_id"] = component_id_text

    property_paths, property_list_evidence = _build_property_list_evidence(component_pair)
    details["property_discovery_ladder"] = {
        "build_component_property_list": property_list_evidence,
    }
    proof_component_family = command.get("args", {}).get("proof_component_family")
    include_scalar_target_discovery = (
        command.get("args", {}).get("include_scalar_target_discovery") is True
    )
    if include_scalar_target_discovery:
        scalar_target_discovery = _run_scalar_target_discovery_ladder(
            command,
            component_pair,
            property_paths,
            property_list_evidence,
        )
        details["scalar_target_discovery"] = scalar_target_discovery
        details["property_discovery_ladder"]["build_component_property_tree_editor"] = (
            scalar_target_discovery["build_component_property_tree_editor"]
        )
        source_inspection_evidence = command.get("args", {}).get(
            "source_inspection_evidence"
        )
        if isinstance(source_inspection_evidence, dict):
            details["source_inspection_evidence"] = source_inspection_evidence
        normalized_property_paths = [
            str(entry.get("property_path")).strip()
            for entry in scalar_target_discovery.get("normalized_entries", [])
            if str(entry.get("property_path") or "").strip()
        ]
        details["raw_property_paths"] = (
            [str(path) for path in property_paths]
            if isinstance(property_paths, list)
            else None
        )
        details["property_paths"] = list(dict.fromkeys(normalized_property_paths))
        details["component_property_count"] = len(details["property_paths"])
        details["exact_editor_apis"] = [
            "ControlPlaneEditorBridge filesystem inbox",
            "editor.component.property.list",
            "EditorComponentAPIBus.BuildComponentPropertyList",
            "EditorComponentAPIBus.BuildComponentPropertyTreeEditor",
            "PropertyTreeEditor.build_paths_list_with_types",
            "PropertyTreeEditor.build_paths_list",
            "PropertyTreeEditor.get_value",
            "EditorComponentAPIBus.GetComponentProperty",
        ]
        return _response(
            command=command,
            started_at=started_at,
            success=True,
            status="ok",
            result_summary=(
                "Collected proof-only scalar target discovery matrix evidence "
                "through the persistent bridge session."
            ),
            details=details,
        )

    include_property_tree_evidence = (
        proof_component_family == "Comment"
        and command.get("args", {}).get("include_property_tree_evidence") is True
    )
    if include_property_tree_evidence:
        comment_scalar_discovery = _run_comment_scalar_discovery_ladder(
            command,
            component_pair,
            property_paths,
            property_list_evidence,
        )
        details["comment_scalar_discovery"] = comment_scalar_discovery
        details["property_discovery_ladder"]["build_component_property_tree_editor"] = (
            comment_scalar_discovery["build_component_property_tree_editor"]
        )
        source_inspection_evidence = command.get("args", {}).get(
            "source_inspection_evidence"
        )
        if isinstance(source_inspection_evidence, dict):
            details["source_inspection_evidence"] = source_inspection_evidence
        normalized_property_paths = [
            str(entry.get("property_path")).strip()
            for entry in comment_scalar_discovery.get("normalized_entries", [])
            if str(entry.get("property_path") or "").strip()
        ]
        details["raw_property_paths"] = (
            [str(path) for path in property_paths]
            if isinstance(property_paths, list)
            else None
        )
        details["property_paths"] = list(dict.fromkeys(normalized_property_paths))
        details["component_property_count"] = len(details["property_paths"])
        details["exact_editor_apis"] = [
            "ControlPlaneEditorBridge filesystem inbox",
            "editor.component.property.list",
            "EditorComponentAPIBus.BuildComponentPropertyList",
            "EditorComponentAPIBus.BuildComponentPropertyTreeEditor",
            "PropertyTreeEditor.build_paths_list_with_types",
            "PropertyTreeEditor.build_paths_list",
            "EditorComponentAPIBus.GetComponentProperty",
        ]
        return _response(
            command=command,
            started_at=started_at,
            success=True,
            status="ok",
            result_summary=(
                "Collected proof-only Comment scalar property discovery ladder evidence "
                "through the persistent bridge session."
            ),
            details=details,
        )

    if property_list_evidence.get("exception"):
        details["component_property_list_exception"] = property_list_evidence["exception"]
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.property.list raised an editor-side exception.",
            details=details,
            error_code="PROPERTY_LIST_EXCEPTION",
        )

    if not isinstance(property_paths, list):
        details["component_property_list_shape"] = property_list_evidence.get(
            "returned_type"
        )
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.property.list did not return a property path list.",
            details=details,
            error_code="PROPERTY_LIST_UNAVAILABLE",
        )

    normalized_property_paths = [str(property_path) for property_path in property_paths]
    details["property_paths"] = normalized_property_paths
    details["component_property_count"] = len(normalized_property_paths)
    return _response(
        command=command,
        started_at=started_at,
        success=True,
        status="ok",
        result_summary=(
            "Listed explicit component property paths through the persistent bridge session."
        ),
        details=details,
    )


def _get_component_property(command: dict[str, Any], runtime_state: dict[str, Any]) -> dict[str, Any]:
    started_at = utc_now()
    details = _base_details(runtime_state)
    details["prefab_context_notes"] = (
        "Explicit existing-component property readback only through the editor component API; "
        "property mutation, container edits, and broad component discovery remain out of scope."
    )
    if not _editor_available():
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Editor Python bindings are not available inside the bridge host.",
            details=details,
            error_code="EDITOR_BINDINGS_UNAVAILABLE",
        )

    active_level_path = details.get("active_level_path")
    if not isinstance(active_level_path, str) or not active_level_path:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.property.get requires an open loaded level context.",
            details=details,
            error_code="COMPONENT_PROPERTY_LEVEL_CONTEXT_MISSING",
        )

    details["loaded_level_path"] = active_level_path
    details["level_path"] = active_level_path
    requested_level = command.get("args", {}).get("level_path")
    if isinstance(requested_level, str) and requested_level:
        details["requested_level_path"] = requested_level
        if _normalize_level_path(requested_level) != _normalize_level_path(active_level_path):
            return _response(
                command=command,
                started_at=started_at,
                success=False,
                status="failed",
                result_summary="editor.component.property.get level_path must match the currently loaded level.",
                details=details,
                error_code="LOADED_LEVEL_MISMATCH",
            )

    requested_component_id = command.get("args", {}).get("component_id")
    if not isinstance(requested_component_id, str) or not requested_component_id.strip():
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.property.get requires args.component_id.",
            details=details,
            error_code="COMPONENT_ID_MISSING",
        )

    requested_property_path = command.get("args", {}).get("property_path")
    if not isinstance(requested_property_path, str) or not requested_property_path.strip():
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.property.get requires args.property_path.",
            details=details,
            error_code="PROPERTY_PATH_MISSING",
        )

    property_path = requested_property_path.strip()
    details["property_path"] = property_path
    component_pair, component_resolution_details = _coerce_component_pair(
        requested_component_id.strip()
    )
    details.update(component_resolution_details)
    if component_pair is None:
        resolution_path = component_resolution_details.get("component_resolution_path")
        if resolution_path == "entity-not-found":
            result_summary = (
                "editor.component.property.get could not resolve the component's entity "
                "in the loaded level."
            )
            error_code = "COMPONENT_ENTITY_NOT_FOUND"
        elif resolution_path == "component-not-found":
            result_summary = (
                "editor.component.property.get could not resolve the requested explicit "
                "component in the loaded level."
            )
            error_code = "COMPONENT_NOT_FOUND"
        else:
            result_summary = (
                "editor.component.property.get requires a valid explicit component id."
            )
            error_code = "COMPONENT_ID_INVALID"
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary=result_summary,
            details=details,
            error_code=error_code,
        )

    component_id_text = _component_pair_to_string(component_pair)
    if component_id_text is not None:
        details["component_id"] = component_id_text

    try:
        property_paths = editor.EditorComponentAPIBus(
            bus.Broadcast,
            "BuildComponentPropertyList",
            component_pair,
        )
    except Exception as exc:
        details["component_property_list_exception"] = repr(exc)
        property_paths = None

    if isinstance(property_paths, list):
        details["component_property_count"] = len(property_paths)
        if property_path not in property_paths:
            return _response(
                command=command,
                started_at=started_at,
                success=False,
                status="failed",
                result_summary=(
                    "editor.component.property.get could not resolve the requested "
                    "property_path on the explicit component."
                ),
                details=details,
                error_code="PROPERTY_PATH_NOT_FOUND",
            )

    try:
        property_outcome = editor.EditorComponentAPIBus(
            bus.Broadcast,
            "GetComponentProperty",
            component_pair,
            property_path,
        )
    except Exception as exc:
        details["component_property_get_exception"] = repr(exc)
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.property.get raised an editor-side exception.",
            details=details,
            error_code="PROPERTY_GET_EXCEPTION",
        )

    if not property_outcome.IsSuccess():
        try:
            details["component_property_get_error"] = str(property_outcome.GetError())
        except Exception:
            pass
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="editor.component.property.get could not read the requested property.",
            details=details,
            error_code="PROPERTY_GET_FAILED",
        )

    property_value = property_outcome.GetValue()
    serialized_value = _json_safe_value(property_value)
    details["value"] = serialized_value
    value_type = _value_type_from_tree(component_pair, property_path) or _fallback_value_type(
        property_value
    )
    if value_type is not None:
        details["value_type"] = value_type

    return _response(
        command=command,
        started_at=started_at,
        success=True,
        status="ok",
        result_summary=(
            "Read the requested explicit component property through the persistent bridge session."
        ),
        details=details,
    )


def _write_camera_scalar_bool_property_proof(command: dict[str, Any], runtime_state: dict[str, Any]) -> dict[str, Any]:
    started_at = utc_now()
    details = _base_details(runtime_state)
    allowed_component_name = "Camera"
    allowed_property_path = "Controller|Configuration|Make active camera on activation?"
    allowed_provenance = "admitted_runtime_component_add_result"
    operation_name = "editor.camera.scalar.write.proof"
    details["prefab_context_notes"] = (
        "Proof-only Camera bool property write for one exact live component id and one "
        "exact property path; public property-write admission, arbitrary component "
        "writes, arbitrary property writes, and broad property listing remain out of scope."
    )
    details["proof_only"] = True
    details["public_admission"] = False
    details["write_admission"] = False
    details["property_list_admission"] = False
    details["allowed_component_name"] = allowed_component_name
    details["allowed_property_path"] = allowed_property_path
    if not _editor_available():
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Editor Python bindings are not available inside the bridge host.",
            details=details,
            error_code="EDITOR_BINDINGS_UNAVAILABLE",
        )

    active_level_path = details.get("active_level_path")
    if not isinstance(active_level_path, str) or not active_level_path:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Camera scalar write proof requires an open loaded level context.",
            details=details,
            error_code="CAMERA_WRITE_LEVEL_CONTEXT_MISSING",
        )

    details["loaded_level_path"] = active_level_path
    details["level_path"] = active_level_path
    args = command.get("args", {})
    requested_level = args.get("level_path")
    if isinstance(requested_level, str) and requested_level:
        details["requested_level_path"] = requested_level
        if _normalize_level_path(requested_level) != _normalize_level_path(active_level_path):
            return _response(
                command=command,
                started_at=started_at,
                success=False,
                status="failed",
                result_summary="Camera scalar write proof level_path must match the currently loaded level.",
                details=details,
                error_code="LOADED_LEVEL_MISMATCH",
            )

    requested_component_name = args.get("component_name")
    details["requested_component_name"] = requested_component_name
    if requested_component_name != allowed_component_name:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Camera scalar write proof only allows the Camera component.",
            details=details,
            error_code="CAMERA_WRITE_COMPONENT_UNSUPPORTED",
        )
    details["component_name"] = allowed_component_name

    component_id_provenance = args.get("component_id_provenance")
    details["component_id_provenance"] = component_id_provenance
    if component_id_provenance != allowed_provenance:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Camera scalar write proof requires live component id provenance from admitted component add.",
            details=details,
            error_code="CAMERA_WRITE_COMPONENT_PROVENANCE_UNSUPPORTED",
        )

    requested_property_path = args.get("property_path")
    details["property_path"] = requested_property_path
    if requested_property_path != allowed_property_path:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Camera scalar write proof only allows the selected Camera bool path.",
            details=details,
            error_code="CAMERA_WRITE_PROPERTY_PATH_UNSUPPORTED",
        )

    requested_value = args.get("value")
    details["requested_value"] = requested_value
    if not isinstance(requested_value, bool):
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Camera scalar write proof only allows bool values.",
            details=details,
            error_code="CAMERA_WRITE_VALUE_NOT_BOOL",
        )

    expected_current_value = args.get("expected_current_value")
    if expected_current_value is not None and not isinstance(expected_current_value, bool):
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Camera scalar write proof expected_current_value must be bool when provided.",
            details=details,
            error_code="CAMERA_WRITE_EXPECTED_VALUE_NOT_BOOL",
        )
    details["expected_current_value"] = expected_current_value

    restore_boundary_id = args.get("restore_boundary_id")
    details["restore_boundary_id"] = restore_boundary_id
    if not isinstance(restore_boundary_id, str) or not restore_boundary_id.strip():
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Camera scalar write proof requires a restore boundary id before mutation.",
            details=details,
            error_code="CAMERA_WRITE_RESTORE_BOUNDARY_MISSING",
        )

    requested_component_id = args.get("component_id")
    if not isinstance(requested_component_id, str) or not requested_component_id.strip():
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Camera scalar write proof requires args.component_id.",
            details=details,
            error_code="COMPONENT_ID_MISSING",
        )

    component_pair, component_resolution_details = _coerce_component_pair(
        requested_component_id.strip()
    )
    details.update(component_resolution_details)
    if component_pair is None:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Camera scalar write proof requires a valid explicit live component id.",
            details=details,
            error_code="COMPONENT_ID_INVALID",
        )

    component_id_text = _component_pair_to_string(component_pair)
    if component_id_text is not None:
        details["component_id"] = component_id_text

    entity_id = _component_pair_entity_id(component_pair)
    component_numeric_id = _component_pair_component_id(component_pair)
    component_type_id = _resolve_component_type_id(allowed_component_name)
    if entity_id is None or component_type_id is None:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Camera scalar write proof could not resolve the Camera component type.",
            details=details,
            error_code="CAMERA_COMPONENT_TYPE_UNRESOLVED",
        )
    try:
        camera_component_outcome = editor.EditorComponentAPIBus(
            bus.Broadcast,
            "GetComponentOfType",
            entity_id,
            component_type_id,
        )
    except Exception as exc:
        details["camera_component_lookup_exception"] = repr(exc)
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Camera scalar write proof could not verify the component type.",
            details=details,
            error_code="CAMERA_COMPONENT_LOOKUP_FAILED",
        )
    if not camera_component_outcome.IsSuccess():
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Camera scalar write proof did not find a Camera component on the target entity.",
            details=details,
            error_code="CAMERA_COMPONENT_NOT_FOUND",
        )
    camera_component_pair = camera_component_outcome.GetValue()
    camera_component_numeric_id = _component_pair_component_id(camera_component_pair)
    details["camera_component_id"] = _component_pair_to_string(camera_component_pair)
    if (
        component_numeric_id is not None
        and camera_component_numeric_id is not None
        and component_numeric_id != camera_component_numeric_id
    ):
        details["requested_component_numeric_id"] = component_numeric_id
        details["camera_component_numeric_id"] = camera_component_numeric_id
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Camera scalar write proof component_id does not identify the live Camera component.",
            details=details,
            error_code="CAMERA_COMPONENT_ID_MISMATCH",
        )

    try:
        property_paths = editor.EditorComponentAPIBus(
            bus.Broadcast,
            "BuildComponentPropertyList",
            component_pair,
        )
    except Exception as exc:
        details["component_property_list_exception"] = repr(exc)
        property_paths = None
    if not isinstance(property_paths, list) or allowed_property_path not in property_paths:
        details["component_property_count"] = len(property_paths) if isinstance(property_paths, list) else None
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Camera scalar write proof could not verify the allowlisted property path on the live Camera component.",
            details=details,
            error_code="CAMERA_WRITE_PROPERTY_PATH_NOT_FOUND",
        )
    details["component_property_count"] = len(property_paths)

    def read_bool_property(label: str) -> tuple[bool, bool | None, str | None]:
        try:
            property_outcome = editor.EditorComponentAPIBus(
                bus.Broadcast,
                "GetComponentProperty",
                component_pair,
                allowed_property_path,
            )
        except Exception as exc:
            details[f"{label}_read_exception"] = repr(exc)
            return False, None, None
        if not property_outcome.IsSuccess():
            try:
                details[f"{label}_read_error"] = str(property_outcome.GetError())
            except Exception:
                pass
            return False, None, None
        raw_value = property_outcome.GetValue()
        value = _json_safe_value(raw_value)
        value_type = _value_type_from_tree(component_pair, allowed_property_path) or _fallback_value_type(raw_value)
        details[f"{label}_value"] = value
        details[f"{label}_value_type"] = value_type
        if not isinstance(value, bool):
            return False, None, value_type
        return True, value, value_type

    before_success, before_value, before_value_type = read_bool_property("before")
    if not before_success:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Camera scalar write proof could not read the bool property before mutation.",
            details=details,
            error_code="CAMERA_WRITE_BEFORE_READBACK_FAILED",
        )
    if expected_current_value is not None and before_value != expected_current_value:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Camera scalar write proof before value did not match the expected current value.",
            details=details,
            error_code="CAMERA_WRITE_EXPECTED_VALUE_MISMATCH",
        )

    try:
        set_outcome = editor.EditorComponentAPIBus(
            bus.Broadcast,
            "SetComponentProperty",
            component_pair,
            allowed_property_path,
            requested_value,
        )
    except Exception as exc:
        details["component_property_set_exception"] = repr(exc)
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Camera scalar write proof raised while setting the bool property.",
            details=details,
            error_code="CAMERA_WRITE_SET_EXCEPTION",
        )
    set_success = bool(set_outcome)
    if hasattr(set_outcome, "IsSuccess"):
        try:
            set_success = bool(set_outcome.IsSuccess())
        except Exception:
            set_success = False
    details["set_component_property_success"] = set_success
    if not set_success:
        if hasattr(set_outcome, "GetError"):
            try:
                details["component_property_set_error"] = str(set_outcome.GetError())
            except Exception:
                pass
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Camera scalar write proof could not set the bool property.",
            details=details,
            error_code="CAMERA_WRITE_SET_FAILED",
        )

    after_success, after_value, after_value_type = read_bool_property("after")
    if not after_success or after_value != requested_value:
        return _response(
            command=command,
            started_at=started_at,
            success=False,
            status="failed",
            result_summary="Camera scalar write proof did not verify the changed bool value.",
            details=details,
            error_code="CAMERA_WRITE_AFTER_READBACK_FAILED",
        )

    details.update(
        {
            "previous_value": before_value,
            "requested_value": requested_value,
            "value": after_value,
            "value_type": after_value_type or before_value_type or "bool",
            "changed": before_value != after_value,
            "write_verified": True,
            "exact_editor_apis": [
                "ControlPlaneEditorBridge filesystem inbox",
                operation_name,
                "EditorComponentAPIBus.GetComponentOfType",
                "EditorComponentAPIBus.BuildComponentPropertyList",
                "EditorComponentAPIBus.GetComponentProperty",
                "EditorComponentAPIBus.SetComponentProperty",
            ],
        }
    )
    return _response(
        command=command,
        started_at=started_at,
        success=True,
        status="ok",
        result_summary="Proof-only Camera bool property write was applied and read back.",
        details=details,
    )


def execute_command(command: dict[str, Any], runtime_state: dict[str, Any]) -> dict[str, Any]:
    started_at = utc_now()
    operation = command.get("operation")
    if operation == "bridge.ping":
        return _response(
            command=command,
            started_at=started_at,
            success=True,
            status="ok",
            result_summary="Persistent bridge is running and callable.",
            details=_base_details(runtime_state),
        )
    if operation == "bridge.status":
        details = _base_details(runtime_state)
        details["queue_counts"] = runtime_state.get("queue_counts", {})
        details["bridge_started_at"] = runtime_state.get("bridge_started_at")
        return _response(
            command=command,
            started_at=started_at,
            success=True,
            status="ok",
            result_summary="Persistent bridge status captured successfully.",
            details=details,
        )
    if operation == "editor.session.open":
        return _response(
            command=command,
            started_at=started_at,
            success=True,
            status="ok",
            result_summary="Persistent bridge editor session is available.",
            details=_base_details(runtime_state),
        )
    if operation == "editor.level.open":
        return _ensure_level_open(command, runtime_state)
    if operation == "editor.entity.create":
        return _create_root_entity(command, runtime_state)
    if operation == "editor.entity.exists":
        return _entity_exists(command, runtime_state)
    if operation == "editor.component.add":
        return _add_components_to_entity(command, runtime_state)
    if operation == "editor.component.find":
        return _find_component(command, runtime_state)
    if operation == "editor.component.property.list":
        return _list_component_properties(command, runtime_state)
    if operation == "editor.component.property.get":
        return _get_component_property(command, runtime_state)
    if operation == "editor.camera.scalar.write.proof":
        return _write_camera_scalar_bool_property_proof(command, runtime_state)
    if operation == "editor.entity.create.probe":
        return _entity_create_probe(command, runtime_state)
    details = _base_details(runtime_state)
    details["requested_operation"] = operation
    return _response(
        command=command,
        started_at=started_at,
        success=False,
        status="failed",
        result_summary="Requested bridge operation is not allowlisted in this phase.",
        details=details,
        error_code="BRIDGE_OPERATION_UNSUPPORTED",
    )







'@ | Set-Content -Path (Join-Path $editorScriptsRoot "control_plane_bridge_ops.py") -Encoding UTF8

@'
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

TRACE_LOG = SCRIPT_DIR.parents[3] / "user" / "ControlPlaneBridge" / "logs" / "bootstrap_trace.log"


def _trace(message: str) -> None:
    TRACE_LOG.parent.mkdir(parents=True, exist_ok=True)
    with TRACE_LOG.open("a", encoding="utf-8") as handle:
        handle.write(f"{message}\n")


_trace("bootstrap import start")

import control_plane_bridge_poller
_trace("bootstrap import complete")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("request_path", nargs="?")
    parser.add_argument("--project-root", default="")
    parser.add_argument("--engine-root", default="")
    parser.add_argument("--poll-interval", type=float, default=0.25)
    args = parser.parse_args()
    project_root = args.project_root
    engine_root = args.engine_root
    poll_interval = args.poll_interval
    if args.request_path:
        request_payload = json.loads(Path(args.request_path).read_text(encoding="utf-8-sig"))
        if isinstance(request_payload, dict):
            project_root = str(request_payload.get("project_root") or project_root)
            engine_root = str(request_payload.get("engine_root") or engine_root)
            poll_interval = float(request_payload.get("poll_interval") or poll_interval)
    _trace(
        "bootstrap main args "
        f"project_root={project_root!r} engine_root={engine_root!r} "
        f"poll_interval={poll_interval!r}"
    )
    control_plane_bridge_poller.start(
        project_root=project_root or None,
        engine_root=engine_root or None,
        poll_interval=poll_interval,
    )
    return 0


if __name__ == "__main__":
    main()
'@ | Set-Content -Path (Join-Path $editorScriptsRoot "control_plane_bridge_bootstrap.py") -Encoding UTF8

@'
from __future__ import annotations

import json
import os
import sys
import time
import traceback
from datetime import datetime, timezone
from glob import glob
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import control_plane_bridge_ops as bridge_ops

try:
    import azlmbr.legacy.general as general  # type: ignore
except Exception:
    general = None

BRIDGE_NAME = "ControlPlaneEditorBridge"
BRIDGE_VERSION = "0.1.0"
PROTOCOL_VERSION = "v1"

_running = False
_runtime_state: dict[str, Any] = {}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _log(paths: dict[str, Path], message: str) -> None:
    log_path = paths["logs"] / "control_plane_bridge.log"
    try:
        log_path.parent.mkdir(parents=True, exist_ok=True)
        with log_path.open("a", encoding="utf-8") as handle:
            handle.write(f"{_utc_now()} {message}\n")
    except Exception:
        pass


def _bridge_paths(project_root: str | None) -> dict[str, Path]:
    resolved_project_root = str(Path(project_root).resolve()) if project_root else ""
    bridge_root = Path(resolved_project_root) / "user" / "ControlPlaneBridge"
    return {
        "root": bridge_root,
        "inbox": bridge_root / "inbox",
        "processing": bridge_root / "processing",
        "results": bridge_root / "results",
        "deadletter": bridge_root / "deadletter",
        "heartbeat": bridge_root / "heartbeat",
        "logs": bridge_root / "logs",
        "heartbeat_file": bridge_root / "heartbeat" / "status.json",
    }


def _ensure_dirs(paths: dict[str, Path]) -> None:
    for key in ("inbox", "processing", "results", "deadletter", "heartbeat", "logs"):
        paths[key].mkdir(parents=True, exist_ok=True)


def _queue_counts(paths: dict[str, Path]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for key in ("inbox", "processing", "results", "deadletter"):
        command_ids: set[str] = set()
        for candidate in paths[key].glob("*.json*"):
            name = candidate.name
            if name.endswith(".json.resp"):
                command_ids.add(name[: -len(".json.resp")])
            elif name.endswith(".json.tmp"):
                command_ids.add(name[: -len(".json.tmp")])
            elif name.endswith(".json"):
                command_ids.add(name[: -len(".json")])
        counts[key] = len(command_ids)
    return counts


def _heartbeat_payload(paths: dict[str, Path]) -> dict[str, Any]:
    base_details = bridge_ops._base_details(_runtime_state)  # type: ignore[attr-defined]
    return {
        "protocol_version": PROTOCOL_VERSION,
        "bridge_name": BRIDGE_NAME,
        "bridge_version": BRIDGE_VERSION,
        "bridge_started_at": _runtime_state.get("bridge_started_at"),
        "heartbeat_at": _utc_now(),
        "heartbeat_epoch_s": time.time(),
        "project_root": _runtime_state.get("project_root"),
        "engine_root": _runtime_state.get("engine_root"),
        "queue_counts": _queue_counts(paths),
        "running": _running,
        **base_details,
    }


def _write_heartbeat(paths: dict[str, Path]) -> None:
    payload = _heartbeat_payload(paths)
    temp_path = paths["heartbeat_file"].with_suffix(".json.tmp")
    temp_path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    os.replace(temp_path, paths["heartbeat_file"])


def _write_response(path: Path, payload: dict[str, Any]) -> None:
    temp_path = path.with_suffix(path.suffix + ".tmp")
    temp_path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    os.replace(temp_path, path)


def _move_to_processing(paths: dict[str, Path], inbox_path: Path) -> Path:
    processing_path = paths["processing"] / inbox_path.name
    os.replace(inbox_path, processing_path)
    return processing_path


def _error_response(command: dict[str, Any], error_code: str, summary: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "protocol_version": PROTOCOL_VERSION,
        "bridge_command_id": command.get("bridge_command_id"),
        "request_id": command.get("request_id"),
        "operation": command.get("operation"),
        "success": False,
        "status": "failed",
        "bridge_name": BRIDGE_NAME,
        "bridge_version": BRIDGE_VERSION,
        "started_at": _utc_now(),
        "finished_at": _utc_now(),
        "result_summary": summary,
        "details": details or {},
        "error_code": error_code,
        "evidence_refs": [],
    }


def _handle_command(paths: dict[str, Path], processing_path: Path) -> None:
    command_id = processing_path.stem
    try:
        command = json.loads(processing_path.read_text(encoding="utf-8-sig"))
    except Exception as exc:
        deadletter_command = paths["deadletter"] / f"{command_id}.json"
        deadletter_result = paths["deadletter"] / f"{command_id}.json.resp"
        os.replace(processing_path, deadletter_command)
        _write_response(
            deadletter_result,
            _error_response({}, "BRIDGE_COMMAND_INVALID_JSON", f"Bridge command could not be decoded: {exc!r}"),
        )
        _log(paths, f"Deadlettered invalid command {command_id}: {exc!r}")
        return

    if not isinstance(command, dict):
        deadletter_command = paths["deadletter"] / f"{command_id}.json"
        deadletter_result = paths["deadletter"] / f"{command_id}.json.resp"
        os.replace(processing_path, deadletter_command)
        _write_response(
            deadletter_result,
            _error_response({}, "BRIDGE_COMMAND_INVALID_SHAPE", "Bridge command payload must be a JSON object."),
        )
        _log(paths, f"Deadlettered invalid command shape {command_id}.")
        return

    _runtime_state["queue_counts"] = _queue_counts(paths)

    try:
        response = bridge_ops.execute_command(command, _runtime_state)
    except Exception:
        response = _error_response(
            command,
            "BRIDGE_COMMAND_EXCEPTION",
            "Bridge command raised an unhandled exception.",
            {"traceback": traceback.format_exc()},
        )

    if response.get("success") is True:
        result_path = paths["results"] / f"{command_id}.json.resp"
        _write_response(result_path, response)
        processing_path.unlink(missing_ok=True)
        _log(paths, f"Processed bridge command {command_id} successfully.")
        return

    deadletter_command = paths["deadletter"] / f"{command_id}.json"
    deadletter_result = paths["deadletter"] / f"{command_id}.json.resp"
    os.replace(processing_path, deadletter_command)
    _write_response(deadletter_result, response)
    _log(paths, f"Deadlettered bridge command {command_id}: {response.get('error_code')}")


def _process_pending(paths: dict[str, Path]) -> None:
    inbox_files = sorted(glob(str(paths["inbox"] / "*.json")), key=os.path.getmtime)
    for inbox_file in inbox_files:
        processing_path = _move_to_processing(paths, Path(inbox_file))
        _handle_command(paths, processing_path)


def start(project_root: str | None = None, engine_root: str | None = None, poll_interval: float = 0.25) -> bool:
    global _running
    if _running:
        return True
    _running = True
    resolved_project_root = str(Path(project_root).resolve()) if project_root else str(Path(__file__).resolve().parents[3])
    _runtime_state.clear()
    _runtime_state.update(
        {
            "project_root": resolved_project_root,
            "engine_root": engine_root,
            "bridge_started_at": _utc_now(),
        }
    )
    paths = _bridge_paths(resolved_project_root)
    _ensure_dirs(paths)
    _log(paths, "ControlPlaneEditorBridge poller starting.")

    try:
        while _running:
            try:
                _write_heartbeat(paths)
                _process_pending(paths)
            except Exception as exc:
                _log(paths, f"poller loop error: {exc!r}")

            if general is not None:
                try:
                    general.idle_wait(poll_interval)
                except Exception:
                    time.sleep(poll_interval)
            else:
                time.sleep(poll_interval)
    finally:
        _running = False
        _write_heartbeat(paths)
        _log(paths, "ControlPlaneEditorBridge poller stopped.")
    return True


def stop() -> None:
    global _running
    _running = False
'@ | Set-Content -Path (Join-Path $editorScriptsRoot "control_plane_bridge_poller.py") -Encoding UTF8

$projectPath = Join-Path $ProjectRoot "project.json"
$project = Get-Content $projectPath -Raw | ConvertFrom-Json

$externalSubdirectories = [System.Collections.Generic.List[string]]::new()
foreach ($entry in $project.external_subdirectories) {
    [void]$externalSubdirectories.Add([string]$entry)
}
if (-not $externalSubdirectories.Contains("Gems/ControlPlaneEditorBridge")) {
    [void]$externalSubdirectories.Add("Gems/ControlPlaneEditorBridge")
}

$gemNames = [System.Collections.Generic.List[string]]::new()
foreach ($entry in $project.gem_names) {
    [void]$gemNames.Add([string]$entry)
}
if (-not $gemNames.Contains("ControlPlaneEditorBridge")) {
    [void]$gemNames.Add("ControlPlaneEditorBridge")
}

$project.external_subdirectories = $externalSubdirectories
$project.gem_names = $gemNames
$projectJson = $project | ConvertTo-Json -Depth 100
[System.IO.File]::WriteAllText(
    $projectPath,
    $projectJson,
    [System.Text.UTF8Encoding]::new($false)
)

Write-Output "Created ControlPlaneEditorBridge gem scaffold and updated McpSandbox project.json."
