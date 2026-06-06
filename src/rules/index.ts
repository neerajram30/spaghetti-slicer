import type { Rule } from '../types'

import { componentLengthRule } from './architecture/component-length'
import { businessLogicInJSXRule } from './architecture/business-logic-in-jsx'
import { directFetchInComponentRule } from './architecture/direct-fetch-in-component'
import { stateBloatRule } from './architecture/state-bloat'
import { hardcodedSecretsEndpointsRule } from './architecture/hardcoded-secrets-endpoints'
import { indexAsKeyRule } from './react/index-as-key'
import { missingErrorBoundaryRule } from './react/missing-error-boundary'
import { noSubRendersRule } from './react/no-sub-renders'
import { fatControllerRule } from './react/fat-controller'
import { imageMissingDimensionsRule } from './performance/image-missing-dimensions'

export const allRules: Rule[] = [
  componentLengthRule,
  businessLogicInJSXRule,
  directFetchInComponentRule,
  stateBloatRule,
  hardcodedSecretsEndpointsRule,
  indexAsKeyRule,
  missingErrorBoundaryRule,
  noSubRendersRule,
  fatControllerRule,
  imageMissingDimensionsRule,
]

export { finalizeErrorBoundaryViolations, resetErrorBoundaryState } from './react/missing-error-boundary'
