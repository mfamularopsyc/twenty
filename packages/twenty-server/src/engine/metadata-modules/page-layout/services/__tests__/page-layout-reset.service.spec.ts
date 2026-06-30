import { PermissionFlagType } from 'twenty-shared/constants';

import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { createEmptyFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/constant/create-empty-flat-entity-maps.constant';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { type SyncableFlatEntity } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-from.type';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type FlatPageLayoutWidget } from 'src/engine/metadata-modules/flat-page-layout-widget/types/flat-page-layout-widget.type';
import { type FlatViewFieldGroup } from 'src/engine/metadata-modules/flat-view-field-group/types/flat-view-field-group.type';
import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';
import { PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';
import { ViewExceptionCode } from 'src/engine/metadata-modules/view/exceptions/view.exception';
import { ViewService } from 'src/engine/metadata-modules/view/services/view.service';
import { PageLayoutResetService } from 'src/engine/metadata-modules/page-layout/services/page-layout-reset.service';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';
import { DashboardSyncService } from 'src/modules/dashboard-sync/services/dashboard-sync.service';

type UserHasWorkspaceSettingPermissionArgs = Parameters<
  PermissionsService['userHasWorkspaceSettingPermission']
>[0];

const workspaceId = 'workspace-id';
const userWorkspaceId = 'user-workspace-id';
const widgetId = 'widget-id';
const viewId = 'view-id';
const applicationUniversalIdentifier = 'application-universal-identifier';
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

const createFlatMaps = ({ isLocked }: { isLocked: boolean }) => {
  const flatPageLayoutWidgetMaps =
    createFlatEntityMaps<FlatPageLayoutWidget>();
  const flatViewFieldGroupMaps =
    createFlatEntityMaps<FlatViewFieldGroup>();
  const flatViewFieldMaps = createFlatEntityMaps<FlatViewField>();
  const flatViewMaps = createFlatEntityMaps<FlatView>();

  addToMaps(flatPageLayoutWidgetMaps, {
    id: widgetId,
    universalIdentifier: 'widget-universal-identifier',
    applicationUniversalIdentifier,
    configuration: {
      configurationType: WidgetConfigurationType.FIELDS,
      viewId,
    },
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    isActive: true,
    isSystemSideEffect: true,
    overrides: {},
    universalOverrides: {},
  } as unknown as FlatPageLayoutWidget);

  addToMaps(flatViewFieldGroupMaps, {
    id: 'view-field-group-id',
    universalIdentifier: 'view-field-group-universal-identifier',
    viewId,
    name: 'Field group',
    position: 0,
    isVisible: true,
    viewFieldIds: [],
    viewFieldUniversalIdentifiers: [],
    applicationId,
    applicationUniversalIdentifier,
    workspaceId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    isActive: true,
    isSystemSideEffect: true,
    overrides: {},
  } as unknown as FlatViewFieldGroup);

  addToMaps(flatViewFieldMaps, {
    id: 'view-field-id',
    universalIdentifier: 'view-field-universal-identifier',
    viewId,
    applicationUniversalIdentifier,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    isActive: true,
    isSystemSideEffect: true,
    overrides: {},
  } as unknown as FlatViewField);

  addToMaps(flatViewMaps, {
    id: viewId,
    universalIdentifier: 'view-universal-identifier',
    isLocked,
  } as unknown as FlatView);

  return {
    flatPageLayoutWidgetMaps,
    flatViewFieldGroupMaps,
    flatViewFieldMaps,
    flatViewMaps,
  };
};

const createService = ({
  isLocked,
  hasViewsPermission,
}: {
  isLocked: boolean;
  hasViewsPermission: boolean;
}) => {
  const workspaceMigrationValidateBuildAndRunService = {
    validateBuildAndRunWorkspaceMigration: jest
      .fn()
      .mockResolvedValue({ status: 'success' }),
  };

  const workspaceManyOrAllFlatEntityMapsCacheService = {
    getOrRecomputeManyOrAllFlatEntityMaps: jest
      .fn()
      .mockResolvedValue(createFlatMaps({ isLocked })),
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
    updateLinkedDashboardsUpdatedAtByWidgetId: jest.fn(),
    updateLinkedDashboardsUpdatedAtByTabId: jest.fn(),
    updateLinkedDashboardsUpdatedAtByPageLayoutId: jest.fn(),
  };

  const viewService = {
    destroyOne: jest.fn(),
  };

  const permissionsService = {
    userHasWorkspaceSettingPermission: jest
      .fn<Promise<boolean>, [UserHasWorkspaceSettingPermissionArgs]>()
      .mockResolvedValue(hasViewsPermission),
  };

  const service = new PageLayoutResetService(
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
  };
};

describe('PageLayoutResetService locked widget-backed views', () => {
  it('rejects LAYOUTS-only users resetting locked FIELDS widget view config', async () => {
    const { service, workspaceMigrationValidateBuildAndRunService } =
      createService({
        isLocked: true,
        hasViewsPermission: false,
      });

    await expect(
      service.resetPageLayoutWidgetToDefault({
        id: widgetId,
        workspaceId,
        authContext: { userWorkspaceId },
      }),
    ).rejects.toMatchObject({
      code: ViewExceptionCode.VIEW_LOCKED_PERMISSION_DENIED,
    });

    expect(
      workspaceMigrationValidateBuildAndRunService.validateBuildAndRunWorkspaceMigration,
    ).not.toHaveBeenCalled();
  });

  it('preserves LAYOUTS behavior for unlocked FIELDS widget view config resets', async () => {
    const { service, workspaceMigrationValidateBuildAndRunService } =
      createService({
        isLocked: false,
        hasViewsPermission: false,
      });

    await expect(
      service.resetPageLayoutWidgetToDefault({
        id: widgetId,
        workspaceId,
        authContext: { userWorkspaceId },
      }),
    ).resolves.toMatchObject({ id: widgetId });

    expect(
      workspaceMigrationValidateBuildAndRunService.validateBuildAndRunWorkspaceMigration,
    ).toHaveBeenCalledTimes(1);
  });

  it('allows VIEWS users resetting locked FIELDS widget view config', async () => {
    const {
      service,
      permissionsService,
      workspaceMigrationValidateBuildAndRunService,
    } = createService({
      isLocked: true,
      hasViewsPermission: true,
    });

    await expect(
      service.resetPageLayoutWidgetToDefault({
        id: widgetId,
        workspaceId,
        authContext: { userWorkspaceId },
      }),
    ).resolves.toMatchObject({ id: widgetId });

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
  });
});
