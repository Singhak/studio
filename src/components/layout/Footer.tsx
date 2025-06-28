
export function Footer() {
  return (
    <footer className="border-t border-border/40">
      <div className="container flex flex-col items-center justify-center gap-4 py-10 md:h-20 md:flex-row md:py-0">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          &copy; {new Date().getFullYear()} Rally. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
