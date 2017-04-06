interface RefectStoreOption {
  middlewares?: any[]
  enhancers?: any[]
  createTaskMiddleware?: any
  rootEffects?: any[]
  initReducers?: any
  initialState?: any
  storeCreated?: any
}

interface RefectOptions {
  view?: any
  defaultNamespace?: string
  reducer?: any
  tasks?: any
  initialState?: any
  mapStateToProps?: any
}

export function refectRoot(options?: RefectStoreOption): any;

export default function refect<Props>(options: RefectOptions): any;
