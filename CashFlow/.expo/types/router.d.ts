/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams: { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/dashboard`; params?: Router.UnknownInputParams; } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/indexcopy`; params?: Router.UnknownInputParams; } | { pathname: `/otp_verification`; params?: Router.UnknownInputParams; } | { pathname: `/send_payment`; params?: Router.UnknownInputParams; } | { pathname: `/user_info`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; };
      hrefOutputParams: { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | { pathname: `/dashboard`; params?: Router.UnknownOutputParams; } | { pathname: `/`; params?: Router.UnknownOutputParams; } | { pathname: `/indexcopy`; params?: Router.UnknownOutputParams; } | { pathname: `/otp_verification`; params?: Router.UnknownOutputParams; } | { pathname: `/send_payment`; params?: Router.UnknownOutputParams; } | { pathname: `/user_info`; params?: Router.UnknownOutputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; };
      href: Router.RelativePathString | Router.ExternalPathString | `/dashboard${`?${string}` | `#${string}` | ''}` | `/${`?${string}` | `#${string}` | ''}` | `/indexcopy${`?${string}` | `#${string}` | ''}` | `/otp_verification${`?${string}` | `#${string}` | ''}` | `/send_payment${`?${string}` | `#${string}` | ''}` | `/user_info${`?${string}` | `#${string}` | ''}` | `/_sitemap${`?${string}` | `#${string}` | ''}` | { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/dashboard`; params?: Router.UnknownInputParams; } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/indexcopy`; params?: Router.UnknownInputParams; } | { pathname: `/otp_verification`; params?: Router.UnknownInputParams; } | { pathname: `/send_payment`; params?: Router.UnknownInputParams; } | { pathname: `/user_info`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; };
    }
  }
}
