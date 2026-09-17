import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, ShieldCheck, Heart, Sparkles, Phone, Mail, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#200609] text-[#e8dfe2] border-t border-[#380c12] pt-14 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[#380c12]">
          {/* Col 1: Brand & Bio */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#701a28] flex items-center justify-center text-white shadow-lg shadow-[#701a28]/30">
                <Flame className="w-6 h-6 fill-white" />
              </div>
              <span className="font-bold text-2xl text-white tracking-tight">
                Purohit<span className="text-[#e5b869]">Seva</span>
              </span>
            </Link>

            <p className="text-sm text-[#d4c5c8] max-w-sm leading-relaxed">
              India’s trusted platform connecting devout families with verified Vedic scholars,
              acharyas, and purohits for all sacred ceremonies and rituals.
            </p>

            <div className="flex items-center gap-3 text-xs text-[#d4c5c8] pt-2">
              <div className="flex items-center gap-1.5 bg-[#2d090e] px-3 py-1.5 rounded-lg border border-[#441118]">
                <ShieldCheck className="w-4 h-4 text-[#e5b869]" />
                <span>100% Verified Acharyas</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#2d090e] px-3 py-1.5 rounded-lg border border-[#441118]">
                <Sparkles className="w-4 h-4 text-[#e5b869]" />
                <span>Authentic Shastra Vidhi</span>
              </div>
            </div>
          </div>

          {/* Col 2: Popular Pujas */}
          <div>
            <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-4">
              Popular Pujas
            </h4>
            <ul className="space-y-2.5 text-xs text-[#d4c5c8]">
              <li>
                <Link to="/events" className="hover:text-[#e5b869] transition">Gruhapravesham</Link>
              </li>
              <li>
                <Link to="/events" className="hover:text-[#e5b869] transition">Satyanarayana Vratam</Link>
              </li>
              <li>
                <Link to="/events" className="hover:text-[#e5b869] transition">Vedic Marriage Ceremony</Link>
              </li>
              <li>
                <Link to="/events" className="hover:text-[#e5b869] transition">Maha Ganapathi Homa</Link>
              </li>
              <li>
                <Link to="/events" className="hover:text-[#e5b869] transition">Vastu Shanti Puja</Link>
              </li>
              <li>
                <Link to="/events" className="hover:text-[#e5b869] transition">Namakarana Sanskar</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Portals */}
          <div>
            <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-4">
              Portals & Roles
            </h4>
            <ul className="space-y-2.5 text-xs text-[#d4c5c8]">
              <li>
                <Link to="/home" className="hover:text-[#e5b869] transition">Customer Dashboard</Link>
              </li>
              <li>
                <Link to="/rewards" className="text-[#e5b869] hover:text-[#f8deb0] font-semibold transition flex items-center gap-1">
                  <span>🪔 Devotee Rewards Club</span>
                </Link>
              </li>
              <li>
                <Link to="/priests" className="hover:text-[#e5b869] transition">Priest Directory</Link>
              </li>
              <li>
                <Link to="/priest/login" className="hover:text-[#e5b869] transition">Priest Login & Register</Link>
              </li>
              <li>
                <Link to="/priest/dashboard" className="hover:text-[#e5b869] transition">Priest Workspace</Link>
              </li>
              <li>
                <Link to="/admin/login" className="hover:text-[#e5b869] transition">Admin Portal</Link>
              </li>
              <li>
                <Link to="/admin/dashboard" className="hover:text-[#e5b869] transition">Admin Console</Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Help */}
          <div>
            <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-4">
              Seva Kendra Help
            </h4>
            <div className="space-y-3 text-xs text-[#d4c5c8]">
              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-[#e5b869] shrink-0 mt-0.5" />
                <span>+91 80000 99887<br /><span className="text-[#a49195]">Mon - Sun (6 AM - 9 PM)</span></span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#e5b869] shrink-0" />
                <span>support@purohitseva.in</span>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#e5b869] shrink-0 mt-0.5" />
                <span>Indiranagar, Bengaluru, Karnataka 560038</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#a49195] gap-4">
          <p>© {new Date().getFullYear()} Purohit Seva Technologies Private Limited. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-white cursor-pointer transition">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer transition">Terms of Seva</span>
            <span className="hover:text-white cursor-pointer transition">Shastra Compliance</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
