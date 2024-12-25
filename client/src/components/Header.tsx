import { UserMenu } from "./UserMenu";

export function Header() {
  return (
    <header className="border-b bg-primary text-primary-foreground fixed w-full z-50">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-6">
        <div className="flex items-center gap-2 font-semibold">
          Goal Navigator
        </div>
        <UserMenu />
      </div>
    </header>
  );
}