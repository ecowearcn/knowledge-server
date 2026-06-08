export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '知识库详情',
    })
  : { navigationBarTitleText: '知识库详情' };
