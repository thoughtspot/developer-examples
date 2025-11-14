import tsLogo from '/ts-logo.svg'

interface HeaderProps {
    title: string
}

function Header(props: HeaderProps) {

    return (
        <div className="header">
          <a href="https://developers.thoughtspot.com" target="_blank" rel="noreferrer">
            <img src={tsLogo} className="logo" alt="ThoughtSpot Logo" />
          </a>
          <h1 className="page-title">{props.title}</h1>
        </div>
    )
};

export default Header;