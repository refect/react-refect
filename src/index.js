import React, { Component, PropTypes } from 'react';
import hoistStatics from 'hoist-non-react-statics';
import { Provider } from 'react-redux';
import configureRefect, { createRefectStore } from 'refect';
import { get, is, deepBindActions } from 'refect/utils';

const storeShape = PropTypes.shape({
  subscribe: PropTypes.func.isRequired,
  dispatch: PropTypes.func.isRequired,
  getState: PropTypes.func.isRequired,
});

function defaultMapStateToProps(state, props) {
  return { ...props, ...state };
}

function shallowEqual(a, b) {
  /* eslint-disable no-restricted-syntax */
  for (const key in a) {
    if ({}.hasOwnProperty.call(a, key) && (!{}.hasOwnProperty.call(b, key) || a[key] !== b[key])) {
      return false;
    }
  }

  for (const key in b) {
    if ({}.hasOwnProperty.call(b, key) && !{}.hasOwnProperty.call(a, key)) {
      return false;
    }
  }

  return true;
}

export default function refect(options) {
  const { mapStateToProps = defaultMapStateToProps, view, namespace } = options;

  class RefectComponent extends Component {
    static contextTypes = {
      store: storeShape,
    };

    constructor(props, context) {
      super(props, context);
      this.store = context.store;

      const storeAllState = this.store.getState();
      const storeState = get(storeAllState, namespace);

      // 获得当前 namespace 下的 action 与所有 action
      this.actions = deepBindActions(this.store.getActions(namespace), this.store.dispatch);
      this.allActions = deepBindActions(this.store.getActions(), this.store.dispatch);

      this.state = {
        storeState,
        storeAllState,
      };
    }

    componentWillMount() {
      if (this.actions.willMount) {
        this.actions.willMount(this.getFinalProps());
      }
    }

    componentDidMount() {
      // 监听 redux store 变化
      this.unSubscribe = this.store.subscribe(() => {
        const storeAllState = this.store.getState();
        const storeState = get(storeAllState, namespace);

        this.setState({
          storeState,
          storeAllState,
        });
      });

      if (this.actions.mount) {
        this.actions.mount(this.getFinalProps());
      }
    }

    shouldComponentUpdate(props, state) {
      const finalProps = mapStateToProps(state.storeState, props, state.storeAllState);
      const thisFinalProps = mapStateToProps(this.state.storeState,
        this.props, this.state.storeAllState);

      return !shallowEqual(finalProps, thisFinalProps);
    }

    componentWillUnmount() {
      this.unSubscribe();

      if (this.actions.unMount) {
        this.actions.unMount(this.getFinalProps());
      }
    }

    getFinalProps() {
      const { storeState, storeAllState } = this.state;

      return {
        ...mapStateToProps(storeState, this.props, storeAllState),
        actions: this.actions,
        allActions: this.allActions,
        dispatch: this.store.dispatch,
      };
    }

    render() {
      return React.createElement(view, this.getFinalProps());
    }
  }

  const wrappedComponentName = view.displayName || view.name || 'Component';

  RefectComponent.displayName = `Refect(${wrappedComponentName})`;

  return hoistStatics(RefectComponent, view);
}

export function refectRoot(options) {
  const { storeAll } = options;
  function RefectRootComponent(props) {
    const { children, ...rest } = props;
    const store = createRefectStore({
      ...options,
      ...rest,
    });

    storeAll.forEach((componentStore) => {
      const { namespace } = componentStore;

      configureRefect({
        options: componentStore,
        namespace,
        store,
        uuid: Math.random(),
      });
    });

    return (
      <Provider store={store} >
        {children}
      </Provider>
    );
  }

  return RefectRootComponent;
}
