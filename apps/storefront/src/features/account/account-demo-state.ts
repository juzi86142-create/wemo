export interface AccountDemoProfile {
  name: string;
  phone: string;
  locale: string;
}

export interface AccountDemoAddress {
  id: string | number;
  kind: string;
  recipient: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface AccountDemoState {
  profile: AccountDemoProfile;
  addresses: AccountDemoAddress[];
}

const defaultProfile: AccountDemoProfile = {
  name: "Alex Taylor",
  phone: "",
  locale: "en-US",
};

const defaultAddresses: AccountDemoAddress[] = [
  {
    id: "address-1",
    kind: "Home",
    recipient: "Alex Taylor",
    line1: "18 Active Lane",
    line2: "",
    city: "Portland",
    region: "OR",
    postalCode: "97205",
    country: "United States",
    isDefault: true,
  },
];

export function createAccountDemoState(seed: Partial<AccountDemoState> = {}): AccountDemoState {
  return {
    profile: { ...defaultProfile, ...seed.profile },
    addresses: (seed.addresses ?? defaultAddresses).map((address) => ({ ...address })),
  };
}

export function updateDemoProfile(
  state: AccountDemoState,
  values: Partial<AccountDemoProfile>,
): AccountDemoState {
  return { ...state, profile: { ...state.profile, ...values } };
}

export function upsertDemoAddress(
  state: AccountDemoState,
  address: AccountDemoAddress,
): AccountDemoState {
  const exists = state.addresses.some((item) => item.id === address.id);
  const addresses = exists
    ? state.addresses.map((item) => (item.id === address.id ? address : item))
    : [...state.addresses, address];
  const hasDefault = addresses.some((item) => item.isDefault);

  return {
    ...state,
    addresses: addresses.map((item, index) => ({
      ...item,
      isDefault: hasDefault ? item.isDefault : index === 0,
    })),
  };
}

export function removeDemoAddress(state: AccountDemoState, addressId: AccountDemoAddress["id"]): AccountDemoState {
  const addresses = state.addresses.filter((item) => item.id !== addressId);
  const hasDefault = addresses.some((item) => item.isDefault);
  return {
    ...state,
    addresses: addresses.map((item, index) => (hasDefault || index !== 0 ? item : { ...item, isDefault: true })),
  };
}

export function setDemoDefaultAddress(state: AccountDemoState, addressId: AccountDemoAddress["id"]): AccountDemoState {
  return {
    ...state,
    addresses: state.addresses.map((item) => ({ ...item, isDefault: item.id === addressId })),
  };
}
