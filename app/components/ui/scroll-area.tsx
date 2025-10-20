import { ScrollArea as RadixScrollArea } from "radix-ui";

export const ScrollArea =  ({ children }) => (
	<RadixScrollArea.Root>
		<RadixScrollArea.Viewport />
		<RadixScrollArea.Scrollbar orientation="horizontal">
			<RadixScrollArea.Thumb />
		</RadixScrollArea.Scrollbar>
		<RadixScrollArea.Scrollbar orientation="vertical">
			<RadixScrollArea.Thumb />
		</RadixScrollArea.Scrollbar>
		<RadixScrollArea.Corner />
	</RadixScrollArea.Root>
);
