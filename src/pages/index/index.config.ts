export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '知识库',
    })
  : { navigationBarTitleText: '知识库' };
