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
from pathlib import Path
from typing import Any
from datetime import datetime, timezone

try:
    import azlmbr.bus as bus  # type: ignore
    import azlmbr.editor as editor  # type: ignore
    import azlmbr.legacy.general as general  # type: ignore
    from azlmbr.entity import EntityId  # type: ignore
except Exception:
    bus = None
    editor = None
    general = None
    EntityId = None

BRIDGE_NAME = "ControlPlaneEditorBridge"
BRIDGE_VERSION = "0.1.0"
PROTOCOL_VERSION = "v1"
DEFAULT_LEVEL_TEMPLATE = "DefaultLevel"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _editor_available() -> bool:
    return not (bus is None or editor is None or general is None or EntityId is None)


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
