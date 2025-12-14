import { Link } from "react-router-dom";

interface NavLink {
  name: string;
  path: string;
}

interface NavLinksProps {
  links: NavLink[];
  className?: string;
}

export const NavLinks = ({ links, className = "" }: NavLinksProps) => {
  return (
    <>
      {links.map((link) => (
        <Link
          key={link.path}
          to={link.path}
          className={`text-foreground hover:text-primary transition-colors font-medium ${className}`}
        >
          {link.name}
        </Link>
      ))}
    </>
  );
};
