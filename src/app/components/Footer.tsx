import Image from "next/image";

export default function Footer() {
    return (
      <footer className="bg-black text-white px-8 py-3 border-t border-gray-700">
        <div className="flex items-center justify-between">
          {/* Left Side - UAL Logo */}
          <div className="flex items-center">
            <Image 
              src="/logo.png" 
              alt="UAL Logo" 
              width={160}
              height={64}
              className="hover:opacity-90 transition-all"
            />
          </div>
          
          {/* Right Side - Text Content */}
          <div className="text-right">
            <a 
              href="https://www.arts.ac.uk/subjects/creative-computing/postgraduate/ma-internet-equalities" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white hover:text-gray-300 transition-colors"
            >
              Digital Literacy Toolkit | MA Internet Equalities
            </a>
            <p className="text-sm text-gray-400 mt-1">powered by: Creative Computing Institute, <br />University of the Arts London</p>
          </div>
        </div>
      </footer>
    );
  }
  