
import { UserMenu } from "./UserMenu";

export function Header() {
  return (
    <header className="bg-primary text-primary-foreground fixed w-full">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-6">
        <div className="flex items-center gap-2 font-semibold">
          Goal Navigator
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
