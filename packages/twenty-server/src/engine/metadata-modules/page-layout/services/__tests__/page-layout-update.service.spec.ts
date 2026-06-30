import { PermissionFlagType } from 'twenty-shared/constants';
import { PageLayoutTabLayoutMode } from 'twenty-shared/types';

import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { createEmptyFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/constant/create-empty-flat-entity-maps.constant';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { type SyncableFlatEntity } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-from.type';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type FlatPageLayoutTab } from 'src/engine/metadata-modules/flat-page-layout-tab/types/flat-page-layout-tab.type';
import { type FlatPageLayoutWidget } from 'src/engine/metadata-modules/flat-page-layout-widget/types/flat-page-layout-widget.type';
import { type FlatPageLayout } from 'src/engine/metadata-modules/flat-page-layout/types/flat-page-layout.type';
import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';
import { WidgetType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-type.enum';
import { PageLayoutType } from 'src/engine/metadata-modules/page-layout/enums/page-layout-type.enum';
import { PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';
import { ViewExceptionCode } from 'src/engine/metadata-modules/view/exceptions/view.exception';
import { ViewService } from 'src/engine/metadata-modules/view/services/view.service';
import { PageLayoutUpdateService } from 'src/engine/metadata-modules/page-layout/services/page-layout-update.service';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';
import { DashboardSyncService } from 'src/modules/dashboard-sync/services/dashboard-sync.service';

type UserHasWorkspaceSettingPermissionArgs = Parameters<
  PermissionsService['userHasWorkspaceSettingPermission']
>[0];

const workspaceId = 'workspace-id';
const userWorkspaceId = 'user-workspace-id';
const pageLayoutId = 'page-layout-id';
const pageLayoutTabId = 'page-layout-tab-id';
const widgetId = 'widget-id';
const viewId = 'view-id';
const applicationId = 'application-id';
const workspaceCustomApplicationUniversalIdentifier =
  'workspace-custom-application-universal-identifier';
const now = '2026-01-01T00:00:00.000Z';

const createFlatEntityMaps = <T extends SyncableFlatEntity>() =>
  createEmptyFlatEntityMaps() as FlatEntityMaps<T>;

const addToMaps = <T extends SyncableFlatEntity>(
  maps: FlatEntityMaps<T>,
  entity: T,
) => {
  maps.universalIdentifierById[entity.id] = entity.universalIdentifier;
  maps.byUniversalIdentifier[entity.universalIdentifier] = entity;
};

const createFlatMaps = ({
  isLocked,
  widgetConfigurationType,
}: {
  isLocked: boolean;
  widgetConfigurationType: WidgetConfigurationType;
}) => {
  const flatPageLayoutMaps = createFlatEntityMaps<FlatPageLayout>();
  const flatPageLayoutTabMaps = createFlatEntityMaps<FlatPageLayoutTab>();
  const flatPageLayoutWidgetMaps =
    createFlatEntityMaps<FlatPageLayoutWidget>();
  const flatViewMaps = createFlatEntityMaps<FlatView>();

  addToMaps(flatPageLayoutMaps, {
    id: pageLayoutId,
    universalIdentifier: 'page-layout-universal-identifier',
    name: 'Record page',
    type: PageLayoutType.RECORD_PAGE,
    objectMetadataId: 'object-metadata-id',
    defaultTabToFocusOnMobileAndSidePanelId: null,
    applicationId,
    applicationUniversalIdentifier: workspaceCustomApplicationUniversalIdentifier,
    workspaceId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    isActive: true,
    isSystemSideEffect: false,
    tabIds: [pageLayoutTabId],
    tabUniversalIdentifiers: ['page-layout-tab-universal-identifier'],
    overrides: null,
  } as unknown as FlatPageLayout);

  addToMaps(flatPageLayoutTabMaps, {
    id: pageLayoutTabId,
    universalIdentifier: 'page-layout-tab-universal-identifier',
    pageLayoutId,
    title: 'Overview',
    position: 0,
    layoutMode: PageLayoutTabLayoutMode.GRID,
    applicationUniversalIdentifier: workspaceCustomApplicationUniversalIdentifier,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    isActive: true,
    isSystemSideEffect: false,
    widgetIds: [widgetId],
    overrides: null,
  } as unknown as FlatPageLayoutTab);

  addToMaps(flatPageLayoutWidgetMaps, {
    id: widgetId,
    universalIdentifier: 'page-layout-widget-universal-identifier',
    pageLayoutTabId,
    title: 'Widget',
    type:
      widgetConfigurationType === WidgetConfigurationType.FIELDS
        ? WidgetType.FIELDS
        : WidgetType.STANDALONE_RICH_TEXT,
    gridPosition: {
      row: 0,
      column: 0,
      rowSpan: 1,
      columnSpan: 1,
    },
    position: null,
    configuration:
      widgetConfigurationType === WidgetConfigurationType.FIELDS
        ? {
            configurationType: WidgetConfigurationType.FIELDS,
            viewId,
          }
        : {
            configurationType: WidgetConfigurationType.STANDALONE_RICH_TEXT,
            body: null,
          },
    applicationUniversalIdentifier: workspaceCustomApplicationUniversalIdentifier,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    isActive: true,
    isSystemSideEffect: false,
    overrides: null,
    universalOverrides: null,
  } as unknown as FlatPageLayoutWidget);

  addToMaps(flatViewMaps, {
    id: viewId,
    universalIdentifier: 'view-universal-identifier',
    isLocked,
  } as unknown as FlatView);

  return {
    flatPageLayoutMaps,
    flatPageLayoutTabMaps,
    flatPageLayoutWidgetMaps,
    flatViewMaps,
    flatObjectMetadataMaps: createEmptyFlatEntityMaps(),
    flatFieldMetadataMaps: createEmptyFlatEntityMaps(),
    flatFrontComponentMaps: createEmptyFlatEntityMaps(),
    flatViewFieldGroupMaps: createEmptyFlatEntityMaps(),
  };
};

const createService = ({
  isLocked,
  hasViewsPermission,
  widgetConfigurationType,
}: {
  isLocked: boolean;
  hasViewsPermission: boolean;
  widgetConfigurationType: WidgetConfigurationType;
}) => {
  const workspaceMigrationValidateBuildAndRunService = {
    validateBuildAndRunWorkspaceMigration: jest
      .fn()
      .mockResolvedValue({ status: 'success' }),
  };

  const workspaceManyOrAllFlatEntityMapsCacheService = {
    getOrRecomputeManyOrAllFlatEntityMaps: jest.fn().mockResolvedValue(
      createFlatMaps({
        isLocked,
        widgetConfigurationType,
      }),
    ),
  };

  const applicationService = {
    findWorkspaceTwentyStandardAndCustomApplicationOrThrow: jest
      .fn()
      .mockResolvedValue({
        workspaceCustomFlatApplication: {
          id: 'workspace-custom-application-id',
          universalIdentifier: workspaceCustomApplicationUniversalIdentifier,
        },
      }),
  };

  const dashboardSyncService = {
    updateLinkedDashboardsUpdatedAtByPageLayoutId: jest.fn(),
  };

  const viewService = {
    destroyOne: jest.fn().mockResolvedValue({ id: viewId }),
  };

  const permissionsService = {
    userHasWorkspaceSettingPermission: jest
      .fn<Promise<boolean>, [UserHasWorkspaceSettingPermissionArgs]>()
      .mockResolvedValue(hasViewsPermission),
  };

  const service = new PageLayoutUpdateService(
    workspaceMigrationValidateBuildAndRunService as unknown as WorkspaceMigrationValidateBuildAndRunService,
    workspaceManyOrAllFlatEntityMapsCacheService as unknown as WorkspaceManyOrAllFlatEntityMapsCacheService,
    applicationService as unknown as ApplicationService,
    dashboardSyncService as unknown as DashboardSyncService,
    viewService as unknown as ViewService,
    permissionsService as unknown as PermissionsService,
  );

  return {
    service,
    workspaceMigrationValidateBuildAndRunService,
    permissionsService,
    viewService,
  };
};

const updateInputWithRemovedWidget = {
  name: 'Record page',
  type: PageLayoutType.RECORD_PAGE,
  objectMetadataId: 'object-metadata-id',
  tabs: [
    {
      id: pageLayoutTabId,
      title: 'Overview',
      position: 0,
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [],
    },
  ],
};

describe('PageLayoutUpdateService locked widget-backed views', () => {
  it('blocks orphaned locked FIELDS widget view destruction for LAYOUTS-only users', async () => {
    const { service, workspaceMigrationValidateBuildAndRunService, viewService } =
      createService({
        isLocked: true,
        hasViewsPermission: false,
        widgetConfigurationType: WidgetConfigurationType.FIELDS,
      });

    await expect(
      service.updatePageLayoutWithTabs({
        id: pageLayoutId,
        workspaceId,
        input: updateInputWithRemovedWidget,
        authContext: { userWorkspaceId },
      }),
    ).rejects.toMatchObject({
      code: ViewExceptionCode.VIEW_LOCKED_PERMISSION_DENIED,
    });

    expect(
      workspaceMigrationValidateBuildAndRunService.validateBuildAndRunWorkspaceMigration,
    ).not.toHaveBeenCalled();
    expect(viewService.destroyOne).not.toHaveBeenCalled();
  });

  it('allows orphaned locked FIELDS widget view destruction for VIEWS users', async () => {
    const {
      service,
      permissionsService,
      workspaceMigrationValidateBuildAndRunService,
      viewService,
    } = createService({
      isLocked: true,
      hasViewsPermission: true,
      widgetConfigurationType: WidgetConfigurationType.FIELDS,
    });

    await expect(
      service.updatePageLayoutWithTabs({
        id: pageLayoutId,
        workspaceId,
        input: updateInputWithRemovedWidget,
        authContext: { userWorkspaceId },
      }),
    ).resolves.toMatchObject({ id: pageLayoutId });

    expect(
      permissionsService.userHasWorkspaceSettingPermission,
    ).toHaveBeenCalledWith({
      workspaceId,
      userWorkspaceId,
      apiKeyId: undefined,
      applicationId: undefined,
      setting: PermissionFlagType.VIEWS,
    });
    expect(
      workspaceMigrationValidateBuildAndRunService.validateBuildAndRunWorkspaceMigration,
    ).toHaveBeenCalledTimes(1);
    expect(viewService.destroyOne).toHaveBeenCalledWith({
      destroyViewInput: { id: viewId },
      workspaceId,
    });
  });

  it('keeps non-view-backed widget removal on the existing LAYOUTS path', async () => {
    const {
      service,
      permissionsService,
      workspaceMigrationValidateBuildAndRunService,
      viewService,
    } = createService({
      isLocked: true,
      hasViewsPermission: false,
      widgetConfigurationType: WidgetConfigurationType.STANDALONE_RICH_TEXT,
    });

    await expect(
      service.updatePageLayoutWithTabs({
        id: pageLayoutId,
        workspaceId,
        input: updateInputWithRemovedWidget,
        authContext: { userWorkspaceId },
      }),
    ).resolves.toMatchObject({ id: pageLayoutId });

    expect(
      permissionsService.userHasWorkspaceSettingPermission,
    ).not.toHaveBeenCalled();
    expect(
      workspaceMigrationValidateBuildAndRunService.validateBuildAndRunWorkspaceMigration,
    ).toHaveBeenCalledTimes(1);
    expect(viewService.destroyOne).not.toHaveBeenCalled();
  });
});
