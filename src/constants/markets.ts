/** 市场配置 —— 由用户在设置中配置（名称 + 地址），存储于 appStore/app-config，多市场各占一个 tab */

export interface MarketConfig {
  name: string
  url: string
}
