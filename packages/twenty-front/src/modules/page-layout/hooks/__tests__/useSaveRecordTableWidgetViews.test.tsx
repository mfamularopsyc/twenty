import { act, renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { type ReactNode } from 'react';

import { useSaveRecordTableWidgetViews } from '@/page-layout/hooks/useSaveRecordTableWidgetViews';
import { pageLayoutDraftComponentState } from '@/page-layout/states/pageLayoutDraftComponentState';
import { recordTableWidgetViewDraftComponentState } from '@/page-layout/states/recordTableWidgetViewDraftComponentState';
import { recordTableWidgetViewPersistedComponentState } from '@/page-layout/states/recordTableWidgetViewPersistedComponentState';
import {
  PageLayoutType,
  WidgetConfigurationType,
  WidgetType,
} from '~/generated-metadata/graphql';

const mockUseCanPersistViewChanges = jest.fn();
const mockHasRecordTableWidgetViewChanges = jest.fn();
const mockUpsertViewWidgetMutation = jest.fn();

jest.mock('@/views/hooks/useCanPersistViewChanges', () => ({
  useCanPersistViewChanges: () => mockUseCanPersistViewChanges(),
}));

jest.mock('@/page-layout/hooks/useHasRecordTableWidgetViewChanges', () => ({
  useHasRecordTableWidgetViewChanges: () => ({
    hasRecordTableWidgetViewChanges: mockHasRecordTableWidgetViewChanges,
  }),
}));

jest.mock('@apollo/client/react', () => ({
  useMutation: () => [mockUpsertViewWidgetMutation],
}));

describe('useSaveRecordTableWidgetViews', () => {
  const pageLayoutId = 'page-layout-id';
  const widgetId = 'widget-id';
  const viewId = 'view-id';
  const recordTableWidgetViewDraft = {
    [widgetId]: {
      view: {
        id: viewId,
      },
      viewFields: [],
      viewFilters: [],
      viewFilterGroups: [],
      viewSorts: [],
    },
  };

  const renderUseSaveRecordTableWidgetViews = () => {
    const store = createStore();

    store.set(
      pageLayoutDraftComponentState.atomFamily({
        instanceId: pageLayoutId,
      }),
      {
        id: pageLayoutId,
        name: 'Page layout',
        type: PageLayoutType.DASHBOARD,
        objectMetadataId: null,
        defaultTabToFocusOnMobileAndSidePanelId: null,
        tabs: [
          {
            id: 'page-layout-tab-id',
            widgets: [
              {
                id: widgetId,
                type: WidgetType.RECORD_TABLE,
                configuration: {
                  configurationType: WidgetConfigurationType.RECORD_TABLE,
                  viewId,
                },
              },
            ],
          },
        ],
      } as never,
    );
    store.set(
      recordTableWidgetViewDraftComponentState.atomFamily({
        instanceId: pageLayoutId,
      }),
      recordTableWidgetViewDraft as never,
    );
    store.set(
      recordTableWidgetViewPersistedComponentState.atomFamily({
        instanceId: pageLayoutId,
      }),
      {},
    );

    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    return {
      store,
      ...renderHook(() => useSaveRecordTableWidgetViews(), { wrapper }),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCanPersistViewChanges.mockReturnValue({ canPersistChanges: true });
    mockHasRecordTableWidgetViewChanges.mockReturnValue(true);
    mockUpsertViewWidgetMutation.mockResolvedValue({});
  });

  it('does not persist or mark drafts as persisted when current view changes cannot be persisted', async () => {
    mockUseCanPersistViewChanges.mockReturnValue({ canPersistChanges: false });

    const { result, store } = renderUseSaveRecordTableWidgetViews();

    await act(async () => {
      await result.current.saveRecordTableWidgetViews(pageLayoutId);
    });

    expect(mockUpsertViewWidgetMutation).not.toHaveBeenCalled();
    expect(
      store.get(
        recordTableWidgetViewPersistedComponentState.atomFamily({
          instanceId: pageLayoutId,
        }),
      ),
    ).toEqual({});
  });

  it('persists and marks drafts as persisted when current view changes can be persisted', async () => {
    const { result, store } = renderUseSaveRecordTableWidgetViews();

    await act(async () => {
      await result.current.saveRecordTableWidgetViews(pageLayoutId);
    });

    expect(mockUpsertViewWidgetMutation).toHaveBeenCalledWith({
      variables: {
        input: {
          widgetId,
          viewFields: [],
          viewFilters: [],
          viewFilterGroups: [],
          viewSorts: [],
        },
      },
    });
    expect(
      store.get(
        recordTableWidgetViewPersistedComponentState.atomFamily({
          instanceId: pageLayoutId,
        }),
      ),
    ).toEqual(recordTableWidgetViewDraft);
  });
});
