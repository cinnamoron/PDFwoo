"use client";
import { TRPCReactProvider } from "@/trpc/client";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/redux/store";
import ThemeController from "@/components/ThemeController";

export default function Providers(
  props: Readonly<{
    children: React.ReactNode;
  }>,
) {
  return (
    <ReduxProvider store={store}>
      <TRPCReactProvider>
        <ThemeController>{props.children}</ThemeController>
      </TRPCReactProvider>
    </ReduxProvider>
  );
}
