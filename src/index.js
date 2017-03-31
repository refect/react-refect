import React, { Component, PropTypes } from 'react';
import hoistStatics from 'hoist-non-react-statics';
import { Provider } from 'react-redux';
import configureRefect, { createRefectStore } from 'refect';
import { get, is } from 'refect/utils';

const storeShape = PropTypes.shape({
  subscribe: PropTypes.func.isRequired,
  dispatch: PropTypes.func.isRequired,
  getState: PropTypes.func.isRequired,
});

function defaultMapStateToProps(state, props) {
  return { ...state, ...props };
}

function getNamespace(parentNamespace, namespace) {
  if (!parentNamespace) {
    return namespace;
  }

  return `${parentNamespace}.${namespace}`;
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
  const { mapStateToProps = defaultMapStateToProps, view, initialState } = options;

  class RefectComponent extends Component {
    static contextTypes = {
      store: storeShape,
      namespace: PropTypes.string,
    };

    static childContextTypes = {
      namespace: PropTypes.string,
    };

    static propTypes = {
      namespace: PropTypes.string,
    };

    static defaultProps = {
      namespace: '',
    };

    static uuid = Math.random();

    static options = options.options;

    constructor(props, context) {
      super(props, context);
      this.store = context.store;

      const parentNamespace = context.namespace || '';

      this.state = {
        storeState: initialState,
        storeAllState: this.store.getState(),
      };

      this.namespace = getNamespace(parentNamespace, props.namespace || options.defaultNamespace);
    }

    getChildContext() {
      return {
        namespace: this.namespace,
      };
    }

    componentWillMount() {
      this.actions = configureRefect({
        options,
        namespace: this.namespace,
        store: this.store,
        uuid: RefectComponent.uuid,
      });

      if (this.actions.willMount) {
        this.actions.willMount(this.props);
      }
    }

    componentDidMount() {
      this.unSubscribe = this.store.subscribe(() => {
        const storeAllState = this.store.getState();
        const storeState = get(storeAllState, this.namespace);

        this.setState({
          storeState,
          storeAllState,
        });
      });

      if (this.actions.mount) {
        this.actions.mount(this.props);
      }
    }

    shouldComponentUpdate(props, state) {
      const finalProps = (state.storeState, props, state.storeAllState);
      const thisFinalProps = mapStateToProps(this.state.storeState,
        this.props, this.state.storeAllState);

      return !shallowEqual(finalProps, thisFinalProps);
    }

    componentWillUnmount() {
      const actions = this.actions;

      this.unSubscribe();

      if (this.actions.unMount) {
        this.actions.unMount(this.props);
      }
    }

    render() {
      const { storeState, storeAllState } = this.state;

      const finalProps = {
        ...mapStateToProps(storeState, this.props, storeAllState),
        actions: this.actions,
        dispatch: this.store.dispatch,
      };

      return React.createElement(view, finalProps);
    }
  }

  const wrappedComponentName = view.displayName || view.name || 'Component';

  RefectComponent.displayName = `Refect(${wrappedComponentName})`;

  return hoistStatics(RefectComponent, view);
}

export function refectRoot(options) {
  function RefectRootComponent(props) {
    const { children, ...rest } = props;
    const store = createRefectStore({
      ...options,
      ...rest,
    });

    return (
      <Provider store={store} >
        {children}
      </Provider>
    );
  }

  return RefectRootComponent;
}

