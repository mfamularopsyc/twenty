import { convertUpdateViewInputToGql } from '@/views/utils/convertUpdateViewInputToGql';

describe('convertUpdateViewInputToGql', () => {
  it('omits isLocked from generic view updates', () => {
    expect(
      convertUpdateViewInputToGql({
        id: 'view-id',
        name: 'View name',
        isLocked: true,
      }),
    ).toEqual({
      id: 'view-id',
      name: 'View name',
    });
  });
});
