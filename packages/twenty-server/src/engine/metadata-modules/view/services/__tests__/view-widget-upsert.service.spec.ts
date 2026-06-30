import { PermissionFlagType } from 'twenty-shared/constants';

import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { createEmptyFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/constant/create-empty-flat-entity-maps.constant';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { type FlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/types/flat-entity-maps.type';
import { type FlatFieldMetadata } from 'src/engine/metadata-modules/flat-field-metadata/types/flat-field-metadata.type';
import { type FlatPageLayoutWidget } from 'src/engine/metadata-modules/flat-page-layout-widget/types/flat-page-layout-widget.type';
import { type FlatViewField } from 'src/engine/metadata-modules/flat-view-field/types/flat-view-field.type';
import { type FlatViewFilterGroup } from 'src/engine/metadata-modules/flat-view-filter-group/types/flat-view-filter-group.type';
import { type FlatViewFilter } from 'src/engine/metadata-modules/flat-view-filter/types/flat-view-filter.type';
import { type FlatViewSort } from 'src/engine/metadata-modules/flat-view-sort/types/flat-view-sort.type';
import { type FlatView } from 'src/engine/metadata-modules/flat-view/types/flat-view.type';
import { WidgetConfigurationType } from 'src/engine/metadata-modules/page-layout-widget/enums/widget-configuration-type.type';
import { PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';
import { ViewEntity } from 'src/engine/metadata-modules/view/entities/view.entity';
import { ViewExceptionCode } from 'src/engine/metadata-modules/view/exceptions/view.exception';
import { ViewWidgetUpsertService } from 'src/engine/metadata-modules/view/services/view-widget-upsert.service';
import { WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

type UserHasWorkspaceSettingPermissionArgs = Parameters<
  PermissionsService['userHasWorkspaceSettingPermission']
>[0];

const workspaceId = 'workspace-id';
const userWorkspaceId = 'user-workspace-id';
const widgetId = 'widget-id';
const widgetUniversalIdentifier = 'widget-universal-identifier';
const viewId = 'view-id';
const viewUniversalIdentifier = 'view-universal-identifier';
const applicationId = 'application-id';
const applicationUniversalIdentifier = 'application-universal-identifier';

const createFlatEntityMaps = <T extends FlatView>(): FlatEntityMaps<T> =>
  createEmptyFlatEntityMaps() as FlatEntityMaps<T>;

const createFlatMaps = ({ isLocked }: { isLocked: boolean }) => {
  const flatPageLayoutWidgetMaps =
    createEmptyFlatEntityMaps() as FlatEntityMaps<
      FlatPageLayoutWidget<WidgetConfigurationType.RECORD_TABLE>
    >;

  flatPageLayoutWidgetMaps.universalIdentifierById[widgetId] =
    widgetUniversalIdentifier;
  flatPageLayoutWidgetMaps.byUniversalIdentifier[widgetUniversalIdentifier] = {
    id: widgetId,
    universalIdentifier: widgetUniversalIdentifier,
    configuration: {
      configurationType: WidgetConfigurationType.RECORD_TABLE,
      viewId,
    },
  } as FlatPageLayoutWidget<WidgetConfigurationType.RECORD_TABLE>;

  const flatViewMaps = createFlatEntityMaps<FlatView>();

  flatViewMaps.universalIdentifierById[viewId] = viewUniversalIdentifier;
  flatViewMaps.byUniversalIdentifier[viewUniversalIdentifier] = {
    id: viewId,
    universalIdentifier: viewUniversalIdentifier,
    isLocked,
  } as FlatView;

  return {
    flatPageLayoutWidgetMaps,
    flatFieldMetadataMaps:
      createEmptyFlatEntityMaps() as FlatEntityMaps<FlatFieldMetadata>,
    flatViewFieldMaps:
      createEmptyFlatEntityMaps() as FlatEntityMaps<FlatViewField>,
    flatViewFilterMaps:
      createEmptyFlatEntityMaps() as FlatEntityMaps<FlatViewFilter>,
    flatViewFilterGroupMaps:
      createEmptyFlatEntityMaps() as FlatEntityMaps<FlatViewFilterGroup>,
    flatViewSortMaps:
      createEmptyFlatEntityMaps() as FlatEntityMaps<FlatViewSort>,
    flatViewMaps,
  };
};

const createService = ({
  isLocked,
  hasLayoutsPermission,
  hasViewsPermission,
}: {
  isLocked: boolean;
  hasLayoutsPermission: boolean;
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
          id: applicationId,
          universalIdentifier: applicationUniversalIdentifier,
        },
      }),
  };

  const permissionsService = {
    userHasWorkspaceSettingPermission: jest
      .fn<Promise<boolean>, [UserHasWorkspaceSettingPermissionArgs]>()
      .mockImplementation(({ setting }) =>
        Promise.resolve(
          setting === PermissionFlagType.VIEWS
            ? hasViewsPermission
            : hasLayoutsPermission,
        ),
      ),
  };

  const viewRepository = {
    findOne: jest.fn().mockResolvedValue({ id: viewId }),
  };

  const service = new ViewWidgetUpsertService(
    workspaceMigrationValidateBuildAndRunService as unknown as WorkspaceMigrationValidateBuildAndRunService,
    workspaceManyOrAllFlatEntityMapsCacheService as unknown as WorkspaceManyOrAllFlatEntityMapsCacheService,
    applicationService as unknown as ApplicationService,
    permissionsService as unknown as PermissionsService,
    viewRepository as unknown as WorkspaceScopedRepository<ViewEntity>,
  );

  return {
    service,
    workspaceMigrationValidateBuildAndRunService,
    permissionsService,
  };
};

describe('ViewWidgetUpsertService', () => {
  it('rejects locked target view mutations for callers with LAYOUTS but without VIEWS', async () => {
    const { service, workspaceMigrationValidateBuildAndRunService } =
      createService({
        isLocked: true,
        hasLayoutsPermission: true,
        hasViewsPermission: false,
      });

    await expect(
      service.upsertViewWidget({
        workspaceId,
        authContext: { userWorkspaceId },
        input: {
          widgetId,
          viewFields: [],
        },
      }),
    ).rejects.toMatchObject({
      code: ViewExceptionCode.VIEW_LOCKED_PERMISSION_DENIED,
    });

    expect(
      workspaceMigrationValidateBuildAndRunService.validateBuildAndRunWorkspaceMigration,
    ).not.toHaveBeenCalled();
  });

  it('allows locked target view mutations for callers with VIEWS', async () => {
    const {
      service,
      permissionsService,
      workspaceMigrationValidateBuildAndRunService,
    } = createService({
      isLocked: true,
      hasLayoutsPermission: false,
      hasViewsPermission: true,
    });

    await expect(
      service.upsertViewWidget({
        workspaceId,
        authContext: { userWorkspaceId },
        input: {
          widgetId,
          viewFields: [],
        },
      }),
    ).resolves.toMatchObject({ id: viewId });

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

  it('preserves unlocked view mutation access for callers with LAYOUTS', async () => {
    const {
      service,
      permissionsService,
      workspaceMigrationValidateBuildAndRunService,
    } = createService({
      isLocked: false,
      hasLayoutsPermission: true,
      hasViewsPermission: false,
    });

    await expect(
      service.upsertViewWidget({
        workspaceId,
        authContext: { userWorkspaceId },
        input: {
          widgetId,
          viewFields: [],
        },
      }),
    ).resolves.toMatchObject({ id: viewId });

    expect(
      permissionsService.userHasWorkspaceSettingPermission,
    ).toHaveBeenCalledWith({
      workspaceId,
      userWorkspaceId,
      apiKeyId: undefined,
      applicationId: undefined,
      setting: PermissionFlagType.LAYOUTS,
    });
    expect(
      workspaceMigrationValidateBuildAndRunService.validateBuildAndRunWorkspaceMigration,
    ).toHaveBeenCalledTimes(1);
  });
});
